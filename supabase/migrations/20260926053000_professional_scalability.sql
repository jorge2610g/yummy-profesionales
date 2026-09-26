-- Professional scalability: server-side client aggregation and reporting
create index if not exists professional_appointments_contact_search_trgm_idx
on public.professional_appointments
using gin ((coalesce(customer_name,'') || ' ' || coalesce(customer_phone,'') || ' ' || coalesce(customer_email,'')) gin_trgm_ops);

create or replace function public.professional_client_directory_page(
  p_restaurant_id bigint,
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
with base as (
  select a.*,
         coalesce(
           a.customer_id::text,
           nullif(lower(btrim(a.customer_email)),''),
           nullif(regexp_replace(coalesce(a.customer_phone,''),'\D','','g'),''),
           lower(btrim(a.customer_name))
         ) as client_key
  from public.professional_appointments a
  where a.restaurant_id=p_restaurant_id
),
latest as (
  select distinct on (client_key) client_key,customer_name,customer_phone,customer_email,starts_at
  from base
  where client_key is not null and client_key<>''
  order by client_key,starts_at desc,id desc
),
agg as (
  select client_key,
         count(*)::bigint appointment_count,
         count(*) filter(where status='completed')::bigint completed_count,
         coalesce(sum(total_amount) filter(where status='completed'),0) completed_total,
         max(starts_at) last_appointment
  from base
  where client_key is not null and client_key<>''
  group by client_key
),
joined as (
  select l.customer_name,l.customer_phone,l.customer_email,
         a.appointment_count,a.completed_count,a.completed_total,a.last_appointment
  from latest l join agg a using(client_key)
  where nullif(btrim(coalesce(p_search,'')),'') is null
     or (coalesce(l.customer_name,'')||' '||coalesce(l.customer_phone,'')||' '||coalesce(l.customer_email,'')) ilike '%'||btrim(p_search)||'%'
),
page as (
  select * from joined
  order by last_appointment desc,customer_name
  offset greatest(coalesce(p_offset,0),0)
  limit least(greatest(coalesce(p_limit,50),1),100)
)
select jsonb_build_object(
  'total',(select count(*) from joined),
  'rows',coalesce((select jsonb_agg(to_jsonb(page) order by last_appointment desc,customer_name) from page),'[]'::jsonb)
)
$$;

revoke all on function public.professional_client_directory_page(bigint,integer,integer,text) from public,anon;
grant execute on function public.professional_client_directory_page(bigint,integer,integer,text) to authenticated;

create or replace function public.professional_report_summary(
  p_restaurant_id bigint,
  p_from timestamptz,
  p_to timestamptz,
  p_today_from timestamptz,
  p_today_to timestamptz
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
with scoped as (
  select a.* from public.professional_appointments a where a.restaurant_id=p_restaurant_id
),
period as (
  select * from scoped where starts_at>=p_from and starts_at<p_to
),
summary as (
  select
    count(*)::bigint total_count,
    count(*) filter(where status='completed')::bigint completed_count,
    count(*) filter(where status='cancelled')::bigint cancelled_count,
    count(*) filter(where status='no_show')::bigint no_show_count,
    coalesce(sum(total_amount) filter(where status='completed'),0) revenue,
    coalesce(avg(total_amount) filter(where status='completed'),0) average_completed
  from period
),
today as (
  select count(*)::bigint today_count from scoped
  where starts_at>=p_today_from and starts_at<p_today_to and status<>'cancelled'
),
upcoming as (
  select count(*)::bigint upcoming_count from scoped
  where starts_at>=now() and status in ('pending','confirmed','in_service')
),
status_counts as (
  select coalesce(jsonb_agg(jsonb_build_object('status',status,'count',cnt) order by cnt desc),'[]'::jsonb) data
  from (select status,count(*)::bigint cnt from period group by status) s
),
top_services as (
  select coalesce(jsonb_agg(jsonb_build_object('service_id',service_id,'service_name',service_name,'count',cnt) order by cnt desc,service_name),'[]'::jsonb) data
  from (
    select a.service_id,coalesce(s.name,'Servicio') service_name,count(*)::bigint cnt
    from period a
    left join public.professional_services s on s.id=a.service_id and s.restaurant_id=a.restaurant_id
    group by a.service_id,s.name
    order by count(*) desc
    limit 10
  ) x
)
select jsonb_build_object(
 'total_count',(select total_count from summary),
 'completed_count',(select completed_count from summary),
 'cancelled_count',(select cancelled_count from summary),
 'no_show_count',(select no_show_count from summary),
 'revenue',(select revenue from summary),
 'average_completed',(select average_completed from summary),
 'today_count',(select today_count from today),
 'upcoming_count',(select upcoming_count from upcoming),
 'status_counts',(select data from status_counts),
 'top_services',(select data from top_services)
)
$$;

revoke all on function public.professional_report_summary(bigint,timestamptz,timestamptz,timestamptz,timestamptz) from public,anon;
grant execute on function public.professional_report_summary(bigint,timestamptz,timestamptz,timestamptz,timestamptz) to authenticated;

analyze public.professional_appointments;
