/* YummyPro Profesionales v2.5.33
   CRUD, agenda, horarios y reportes aislados del rubro restaurante/retail. */
let professionalServices=[];
let professionalProviders=[];
let professionalProviderServices=[];
let professionalAvailability=[];
let professionalTimeOff=[];
let professionalAppointments=[];
let professionalPaymentIntents=[];
let professionalClients=[];
let professionalClientPage=1,professionalClientTotal=0,professionalClientSearchTimer=null;
let professionalReportSummary=null;
const PROFESSIONAL_CLIENT_PAGE_SIZE=50;
const PROFESSIONAL_REPORT_DAYS=30;

const PROFESSIONAL_STATUS_LABELS={
 pending:"Pendiente",confirmed:"Confirmada",in_service:"En atención",
 completed:"Completada",cancelled:"Cancelada",no_show:"No asistió"
};
const PROFESSIONAL_WEEKDAYS=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function professionalGuard(){
 if(!currentRestaurant||!isProfessionalBusiness()){toast("Este módulo es exclusivo del rubro Profesional / Servicios");return false}
 return true;
}
function professionalModal(id,open){const el=document.getElementById(id);if(!el)return;el.classList.toggle("open",open);el.setAttribute("aria-hidden",open?"false":"true")}
function professionalError(scope,error){console.error(scope,error);trackRestaurantError?.("professional",scope,error?.message||String(error),false);toast(error?.message||"No se pudo completar la operación")}
function professionalTimeZone(){return currentRestaurantConfig?.timezone||"America/Santiago"}
function professionalDateKey(value=new Date()){try{return new Intl.DateTimeFormat("en-CA",{timeZone:professionalTimeZone(),year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value))}catch(_){return new Date(value).toISOString().slice(0,10)}}
function professionalDateTime(value){return new Intl.DateTimeFormat(currentRestaurantConfig?.locale||"es-CL",{timeZone:professionalTimeZone(),dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}
function professionalService(id){return professionalServices.find(x=>Number(x.id)===Number(id))}
function professionalProvider(id){return professionalProviders.find(x=>Number(x.id)===Number(id))}
function professionalDateAdd(dateKey,days){const [y,m,d]=String(dateKey).split("-").map(Number),dt=new Date(Date.UTC(y,m-1,d+days));return dt.toISOString().slice(0,10)}
function professionalReportWindow(){
 const today=professionalDateKey(),fromKey=professionalDateAdd(today,-(PROFESSIONAL_REPORT_DAYS-1)),toKey=professionalDateAdd(today,1);
 return {
  from:professionalLocalDateTimeIso(fromKey,"00:00"),
  to:professionalLocalDateTimeIso(toKey,"00:00"),
  todayFrom:professionalLocalDateTimeIso(today,"00:00"),
  todayTo:professionalLocalDateTimeIso(professionalDateAdd(today,1),"00:00")
 }
}
async function fetchProfessionalReportSummary(){
 const w=professionalReportWindow();
 const {data,error}=await sb.rpc("professional_report_summary",{p_restaurant_id:currentRestaurant,p_from:w.from,p_to:w.to,p_today_from:w.todayFrom,p_today_to:w.todayTo});
 if(error)throw error;professionalReportSummary=data||{};return professionalReportSummary
}

function professionalLocalDateTimeIso(date,time){
 if(!date||!time)return null;
 const [y,m,d]=String(date).split("-").map(Number),[hh,mm]=String(time).split(":").map(Number),target=Date.UTC(y,m-1,d,hh,mm,0);
 let guess=target;
 const fmt=new Intl.DateTimeFormat("en-US",{timeZone:professionalTimeZone(),year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
 for(let n=0;n<3;n++){const parts=Object.fromEntries(fmt.formatToParts(new Date(guess)).filter(x=>x.type!=="literal").map(x=>[x.type,x.value])),shown=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute));guess-=shown-target}
 return new Date(guess).toISOString();
}
function professionalPaymentLabel(a){
 if(a.payment_status==="approved")return "Pagado";
 if(a.payment_status==="pending")return "Pago pendiente";
 if(a.payment_status==="refunded")return "Reembolsado";
 if(["rejected","cancelled","expired"].includes(a.payment_status))return "Pago "+a.payment_status;
 return "Sin pago previo";
}

async function loadProfessionalServices(){
 if(!professionalGuard())return;
 const list=document.getElementById("professionalServiceList");if(list)list.innerHTML='<p class="mut">Cargando servicios…</p>';
 const {data,error}=await sb.from("professional_services").select("*").eq("restaurant_id",currentRestaurant).order("sort_order").order("name");
 if(error)return professionalError("services_load",error);professionalServices=data||[];renderProfessionalServices();
}
function renderProfessionalServices(){
 const list=document.getElementById("professionalServiceList");if(!list)return;
 list.innerHTML=professionalServices.map(s=>'<article class="item"><div class="row between"><div><div class="row" style="gap:8px;flex-wrap:wrap"><h3 style="margin:0">'+esc(s.name)+'</h3><span class="pill">'+Number(s.duration_minutes)+' min</span><span class="'+(s.active?'status-active':'status-inactive')+'">'+(s.active?'● Activo':'● Oculto')+'</span></div><div class="mut" style="margin-top:7px">'+esc(s.description||"Sin descripción")+'</div><div class="price" style="margin-top:8px">'+money(s.price)+'</div><div class="mut">Separación entre citas: '+Number(s.buffer_minutes||0)+' min</div></div><div class="actions"><button class="ghost" type="button" onclick="editProfessionalService('+s.id+')">Editar</button><button class="ghost" type="button" onclick="toggleProfessionalService('+s.id+')">'+(s.active?'Ocultar':'Activar')+'</button><button class="danger" type="button" onclick="deleteProfessionalService('+s.id+')">Eliminar</button></div></div></article>').join("")||'<p class="mut">Todavía no hay servicios. Crea el primero para habilitar reservas.</p>';
}
function openProfessionalServiceModal(){
 if(!professionalGuard())return;professionalServiceId.value="";professionalServiceName.value="";professionalServiceDescription.value="";professionalServiceDuration.value=30;professionalServiceBuffer.value=0;professionalServicePrice.value=0;professionalServiceImage.value="";professionalServiceActive.checked=true;professionalServiceModalTitle.textContent="Nuevo servicio";professionalModal("professionalServiceModal",true);setTimeout(()=>professionalServiceName.focus(),60)
}
function closeProfessionalServiceModal(){professionalModal("professionalServiceModal",false)}
function editProfessionalService(id){const s=professionalService(id);if(!s)return;professionalServiceId.value=s.id;professionalServiceName.value=s.name;professionalServiceDescription.value=s.description||"";professionalServiceDuration.value=s.duration_minutes;professionalServiceBuffer.value=s.buffer_minutes||0;professionalServicePrice.value=s.price||0;professionalServiceImage.value=s.image_url||"";professionalServiceActive.checked=!!s.active;professionalServiceModalTitle.textContent="Editar servicio";professionalModal("professionalServiceModal",true)}
async function saveProfessionalService(){
 if(!professionalGuard())return;const id=Number(professionalServiceId.value)||null,row={restaurant_id:currentRestaurant,name:professionalServiceName.value.trim(),description:professionalServiceDescription.value.trim(),duration_minutes:Number(professionalServiceDuration.value||0),buffer_minutes:Number(professionalServiceBuffer.value||0),price:Number(professionalServicePrice.value||0),image_url:professionalServiceImage.value.trim()||null,active:professionalServiceActive.checked,updated_at:new Date().toISOString()};
 if(!row.name)return toast("Escribe el nombre del servicio");if(row.duration_minutes<5)return toast("La duración mínima es de 5 minutos");
 const result=id?await sb.from("professional_services").update(row).eq("id",id).eq("restaurant_id",currentRestaurant):await sb.from("professional_services").insert(row);
 if(result.error)return professionalError("service_save",result.error);closeProfessionalServiceModal();await loadProfessionalServices();trackRestaurantEvent?.("professional_service_saved","services",{service_id:id});toast("Servicio guardado")
}
async function toggleProfessionalService(id){const s=professionalService(id);if(!s)return;const {error}=await sb.from("professional_services").update({active:!s.active,updated_at:new Date().toISOString()}).eq("id",id).eq("restaurant_id",currentRestaurant);if(error)return professionalError("service_toggle",error);await loadProfessionalServices()}
async function deleteProfessionalService(id){const s=professionalService(id);if(!s||!confirm('¿Eliminar el servicio “'+s.name+'”?'))return;const {error}=await sb.from("professional_services").delete().eq("id",id).eq("restaurant_id",currentRestaurant);if(error)return toast("No se puede eliminar porque tiene citas asociadas. Puedes ocultarlo.");await loadProfessionalServices();toast("Servicio eliminado")}

async function loadProfessionalProviders(){
 if(!professionalGuard())return;const list=document.getElementById("professionalProviderList");if(list)list.innerHTML='<p class="mut">Cargando profesionales…</p>';
 const [providers,links,availability,timeOff]=await Promise.all([
  sb.from("professional_providers").select("*").eq("restaurant_id",currentRestaurant).order("sort_order").order("name"),
  sb.from("professional_provider_services").select("*").eq("restaurant_id",currentRestaurant),
  sb.from("professional_availability").select("*").eq("restaurant_id",currentRestaurant).order("weekday").order("start_time"),
  sb.from("professional_time_off").select("*").eq("restaurant_id",currentRestaurant).order("starts_at",{ascending:true})
 ]);
 if(providers.error)return professionalError("providers_load",providers.error);if(links.error)return professionalError("provider_services_load",links.error);if(availability.error)return professionalError("availability_load",availability.error);if(timeOff.error)return professionalError("time_off_load",timeOff.error);
 professionalProviders=providers.data||[];professionalProviderServices=links.data||[];professionalAvailability=availability.data||[];professionalTimeOff=timeOff.data||[];if(!professionalServices.length)await loadProfessionalServices();renderProfessionalProviders();
}
function renderProfessionalProviders(){
 const list=document.getElementById("professionalProviderList");if(!list)return;const now=Date.now();
 list.innerHTML=professionalProviders.map(p=>{const serviceIds=professionalProviderServices.filter(x=>Number(x.provider_id)===Number(p.id)).map(x=>Number(x.service_id)),names=serviceIds.map(id=>professionalService(id)?.name).filter(Boolean),days=[...new Set(professionalAvailability.filter(x=>Number(x.provider_id)===Number(p.id)&&x.active).map(x=>PROFESSIONAL_WEEKDAYS[x.weekday]))],blocks=professionalTimeOff.filter(x=>Number(x.provider_id)===Number(p.id)&&new Date(x.ends_at).getTime()>now).length;return '<article class="item"><div class="row between"><div class="row" style="align-items:flex-start"><div style="width:54px;height:54px;border-radius:16px;overflow:hidden;background:var(--soft);display:grid;place-items:center;font-size:24px">'+(p.photo_url?'<img src="'+esc(p.photo_url)+'" alt="" style="width:100%;height:100%;object-fit:cover">':'👤')+'</div><div><div class="row" style="gap:8px"><h3 style="margin:0">'+esc(p.name)+'</h3><span class="'+(p.active?'status-active':'status-inactive')+'">'+(p.active?'● Activo':'● Inactivo')+'</span></div><div class="mut">'+esc(p.specialty||"Profesional")+'</div><div class="mut" style="margin-top:5px">Servicios: '+esc(names.join(", ")||"Sin servicios asignados")+'</div><div class="mut">Horario: '+esc(days.join(", ")||"Sin horario")+(blocks?' · '+blocks+' bloqueo'+(blocks===1?'':'s')+' próximo'+(blocks===1?'':'s'):'')+'</div></div></div><div class="actions"><button class="primary" type="button" onclick="openProfessionalScheduleModal('+p.id+')">Horario</button><button class="ghost" type="button" onclick="openProfessionalTimeOffModal('+p.id+')">Bloqueos</button><button class="ghost" type="button" onclick="editProfessionalProvider('+p.id+')">Editar</button><button class="danger" type="button" onclick="deleteProfessionalProvider('+p.id+')">Eliminar</button></div></div></article>'}).join("")||'<p class="mut">Todavía no hay profesionales. Agrega uno y configura su horario.</p>';
}
function renderProfessionalProviderServiceOptions(selected=[]){const box=document.getElementById("professionalProviderServiceOptions");if(!box)return;const set=new Set(selected.map(Number));box.innerHTML=professionalServices.filter(s=>s.active||set.has(Number(s.id))).map(s=>'<label class="row" style="justify-content:flex-start;gap:8px"><input class="professional-provider-service" type="checkbox" value="'+s.id+'" style="width:auto" '+(set.has(Number(s.id))?'checked':'')+'> <span>'+esc(s.name)+' · '+Number(s.duration_minutes)+' min</span></label>').join("")||'<p class="mut">Primero crea al menos un servicio.</p>'}
async function openProfessionalProviderModal(){if(!professionalGuard())return;if(!professionalServices.length)await loadProfessionalServices();professionalProviderId.value="";professionalProviderName.value="";professionalProviderSpecialty.value="";professionalProviderBio.value="";professionalProviderPhone.value="";professionalProviderEmail.value="";professionalProviderPhoto.value="";professionalProviderActive.checked=true;professionalProviderModalTitle.textContent="Nuevo profesional";renderProfessionalProviderServiceOptions([]);professionalModal("professionalProviderModal",true);setTimeout(()=>professionalProviderName.focus(),60)}
function closeProfessionalProviderModal(){professionalModal("professionalProviderModal",false)}
function editProfessionalProvider(id){const p=professionalProvider(id);if(!p)return;professionalProviderId.value=p.id;professionalProviderName.value=p.name;professionalProviderSpecialty.value=p.specialty||"";professionalProviderBio.value=p.bio||"";professionalProviderPhone.value=p.phone||"";professionalProviderEmail.value=p.email||"";professionalProviderPhoto.value=p.photo_url||"";professionalProviderActive.checked=!!p.active;professionalProviderModalTitle.textContent="Editar profesional";renderProfessionalProviderServiceOptions(professionalProviderServices.filter(x=>Number(x.provider_id)===Number(id)).map(x=>x.service_id));professionalModal("professionalProviderModal",true)}
async function saveProfessionalProvider(){
 if(!professionalGuard())return;const id=Number(professionalProviderId.value)||null,serviceIds=[...document.querySelectorAll(".professional-provider-service:checked")].map(x=>Number(x.value)),row={restaurant_id:currentRestaurant,name:professionalProviderName.value.trim(),specialty:professionalProviderSpecialty.value.trim(),bio:professionalProviderBio.value.trim(),phone:professionalProviderPhone.value.trim()||null,email:professionalProviderEmail.value.trim()||null,photo_url:professionalProviderPhoto.value.trim()||null,active:professionalProviderActive.checked,updated_at:new Date().toISOString()};
 if(!row.name)return toast("Escribe el nombre del profesional");if(!serviceIds.length)return toast("Selecciona al menos un servicio");
 let providerId=id;if(id){const {error}=await sb.from("professional_providers").update(row).eq("id",id).eq("restaurant_id",currentRestaurant);if(error)return professionalError("provider_save",error)}else{const {data,error}=await sb.from("professional_providers").insert(row).select("id").single();if(error)return professionalError("provider_save",error);providerId=data.id}
 const removed=await sb.from("professional_provider_services").delete().eq("restaurant_id",currentRestaurant).eq("provider_id",providerId);if(removed.error)return professionalError("provider_services_replace",removed.error);
 const inserted=await sb.from("professional_provider_services").insert(serviceIds.map(service_id=>({restaurant_id:currentRestaurant,provider_id:providerId,service_id})));if(inserted.error)return professionalError("provider_services_replace",inserted.error);
 closeProfessionalProviderModal();await loadProfessionalProviders();trackRestaurantEvent?.("professional_provider_saved","professionals",{provider_id:providerId});toast("Profesional guardado")
}
async function deleteProfessionalProvider(id){const p=professionalProvider(id);if(!p||!confirm('¿Eliminar al profesional “'+p.name+'”?'))return;const {error}=await sb.from("professional_providers").delete().eq("id",id).eq("restaurant_id",currentRestaurant);if(error)return toast("No se puede eliminar porque tiene citas asociadas. Puedes desactivarlo.");await loadProfessionalProviders();toast("Profesional eliminado")}

function openProfessionalTimeOffModal(id){
 const p=professionalProvider(id);if(!p)return;professionalTimeOffProviderId.value=id;professionalTimeOffName.textContent=p.name+" · bloqueos de agenda";const date=professionalDateKey();professionalTimeOffDate.value=date;professionalTimeOffDate.min=date;professionalTimeOffStart.value="09:00";professionalTimeOffEnd.value="18:00";professionalTimeOffReason.value="";renderProfessionalTimeOffList(id);professionalModal("professionalTimeOffModal",true);
}
function closeProfessionalTimeOffModal(){professionalModal("professionalTimeOffModal",false)}
function renderProfessionalTimeOffList(providerId=Number(professionalTimeOffProviderId?.value||0)){
 const box=document.getElementById("professionalTimeOffList");if(!box)return;const rows=professionalTimeOff.filter(x=>Number(x.provider_id)===Number(providerId)&&new Date(x.ends_at)>new Date()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
 box.innerHTML=rows.map(x=>'<div class="item row between"><div><b>'+esc(professionalDateTime(x.starts_at))+' → '+esc(professionalDateTime(x.ends_at))+'</b><div class="mut">'+esc(x.reason||"Sin motivo")+'</div></div><button class="danger" type="button" onclick="deleteProfessionalTimeOff('+x.id+')">Eliminar</button></div>').join("")||'<p class="mut">No hay bloqueos próximos. Los bloqueos quitan esos horarios de la reserva pública, pero no cancelan citas ya creadas.</p>';
}
async function saveProfessionalTimeOff(){
 if(!professionalGuard())return;const providerId=Number(professionalTimeOffProviderId.value),date=professionalTimeOffDate.value,start=professionalTimeOffStart.value,end=professionalTimeOffEnd.value,startsAt=professionalLocalDateTimeIso(date,start),endsAt=professionalLocalDateTimeIso(date,end),reason=professionalTimeOffReason.value.trim()||null;
 if(!providerId||!startsAt||!endsAt)return toast("Completa fecha y horario");if(new Date(endsAt)<=new Date(startsAt))return toast("La hora de término debe ser posterior al inicio");
 const {error}=await sb.from("professional_time_off").insert({restaurant_id:currentRestaurant,provider_id:providerId,starts_at:startsAt,ends_at:endsAt,reason});if(error)return professionalError("time_off_save",error);
 const {data,error:loadError}=await sb.from("professional_time_off").select("*").eq("restaurant_id",currentRestaurant).order("starts_at",{ascending:true});if(loadError)return professionalError("time_off_reload",loadError);professionalTimeOff=data||[];renderProfessionalTimeOffList(providerId);renderProfessionalProviders();toast("Bloqueo agregado");
}
async function deleteProfessionalTimeOff(id){
 if(!confirm("¿Eliminar este bloqueo de agenda?"))return;const {error}=await sb.from("professional_time_off").delete().eq("id",id).eq("restaurant_id",currentRestaurant);if(error)return professionalError("time_off_delete",error);
 professionalTimeOff=professionalTimeOff.filter(x=>Number(x.id)!==Number(id));renderProfessionalTimeOffList();renderProfessionalProviders();toast("Bloqueo eliminado");
}

function openProfessionalScheduleModal(id){
 const p=professionalProvider(id);if(!p)return;professionalScheduleProviderId.value=id;professionalScheduleName.textContent=p.name+' · '+(p.specialty||"Servicios");const rows=professionalAvailability.filter(x=>Number(x.provider_id)===Number(id)),hasRows=rows.length>0;
 professionalScheduleRows.innerHTML=PROFESSIONAL_WEEKDAYS.map((day,weekday)=>{const row=rows.find(x=>Number(x.weekday)===weekday),enabled=row?!!row.active:(!hasRows&&weekday>=1&&weekday<=5);return '<div class="item"><div class="grid"><label class="span3"><input class="professional-schedule-enabled" data-weekday="'+weekday+'" type="checkbox" style="width:auto" '+(enabled?'checked':'')+'> '+day+'</label><label class="span3">Desde<input class="professional-schedule-start" data-weekday="'+weekday+'" type="time" value="'+(row?.start_time||"09:00").slice(0,5)+'"></label><label class="span3">Hasta<input class="professional-schedule-end" data-weekday="'+weekday+'" type="time" value="'+(row?.end_time||"18:00").slice(0,5)+'"></label><label class="span3">Intervalo<input class="professional-schedule-interval" data-weekday="'+weekday+'" type="number" min="5" max="240" value="'+Number(row?.slot_interval_minutes||30)+'"></label></div></div>'}).join("");professionalModal("professionalScheduleModal",true)
}
function closeProfessionalScheduleModal(){professionalModal("professionalScheduleModal",false)}
async function saveProfessionalSchedule(){
 if(!professionalGuard())return;const providerId=Number(professionalScheduleProviderId.value),rows=[];
 document.querySelectorAll(".professional-schedule-enabled:checked").forEach(check=>{const weekday=Number(check.dataset.weekday),start=document.querySelector('.professional-schedule-start[data-weekday="'+weekday+'"]')?.value,end=document.querySelector('.professional-schedule-end[data-weekday="'+weekday+'"]')?.value,interval=Number(document.querySelector('.professional-schedule-interval[data-weekday="'+weekday+'"]')?.value||30);rows.push({restaurant_id:currentRestaurant,provider_id:providerId,weekday,start_time:start,end_time:end,slot_interval_minutes:interval,active:true})});
 if(!rows.length)return toast("Activa al menos un día de atención");if(rows.some(x=>!x.start_time||!x.end_time||x.end_time<=x.start_time))return toast("Revisa las horas de inicio y término");
 const removed=await sb.from("professional_availability").delete().eq("restaurant_id",currentRestaurant).eq("provider_id",providerId);if(removed.error)return professionalError("schedule_save",removed.error);const inserted=await sb.from("professional_availability").insert(rows);if(inserted.error)return professionalError("schedule_save",inserted.error);closeProfessionalScheduleModal();await loadProfessionalProviders();toast("Horario guardado")
}

async function loadProfessionalAppointments(){
 if(!professionalGuard())return;
 const list=document.getElementById("professionalAppointmentList"),payments=document.getElementById("professionalPaymentIntentList");
 if(list)list.innerHTML='<p class="mut">Cargando agenda…</p>';if(payments)payments.innerHTML='<p class="mut">Cargando pagos pendientes…</p>';
 const [services,providers,links,paymentIntents]=await Promise.all([
  sb.from("professional_services").select("*").eq("restaurant_id",currentRestaurant).order("sort_order").order("name"),
  sb.from("professional_providers").select("*").eq("restaurant_id",currentRestaurant).order("sort_order").order("name"),
  sb.from("professional_provider_services").select("*").eq("restaurant_id",currentRestaurant),
  sb.from("professional_booking_payment_intents").select("*").eq("restaurant_id",currentRestaurant).in("status",["pending","processing"]).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(100)
 ]);
 const failed=[services,providers,links,paymentIntents].find(x=>x.error);if(failed)return professionalError("appointments_load",failed.error);
 professionalServices=services.data||[];professionalProviders=providers.data||[];professionalProviderServices=links.data||[];professionalPaymentIntents=paymentIntents.data||[];
 syncProfessionalBookingSettings();syncProfessionalAppointmentFilters();
 const date=document.getElementById("professionalAppointmentDateFilter")?.value||professionalDateKey(),status=document.getElementById("professionalAppointmentStatusFilter")?.value||"active",provider=document.getElementById("professionalAppointmentProviderFilter")?.value||"all";
 const from=professionalLocalDateTimeIso(date,"00:00"),to=professionalLocalDateTimeIso(professionalDateAdd(date,1),"00:00");
 let q=sb.from("professional_appointments").select("*").eq("restaurant_id",currentRestaurant).gte("starts_at",from).lt("starts_at",to);
 if(status==="active")q=q.in("status",["pending","confirmed","in_service"]);else if(status!=="all")q=q.eq("status",status);
 if(provider!=="all"&&Number(provider))q=q.eq("provider_id",Number(provider));
 const appointments=await q.order("starts_at",{ascending:true}).limit(250);
 if(appointments.error)return professionalError("appointments_load",appointments.error);
 professionalAppointments=appointments.data||[];
 try{await fetchProfessionalReportSummary()}catch(e){console.error("professional metrics",e)}
 renderProfessionalPaymentIntents();renderProfessionalAppointments();
}
function syncProfessionalBookingSettings(){const r=currentRestaurantConfig||{},mode=String(r.professional_booking_payment_mode||(r.professional_booking_deposit_required?"deposit":"full"));professionalAutoConfirm.checked=r.professional_booking_auto_confirm!==false;professionalMinNotice.value=Number(r.professional_booking_min_notice_hours??2);professionalMaxDays.value=Number(r.professional_booking_max_days??60);professionalPaymentMode.value=["deposit","full"].includes(mode)?mode:"full";professionalDepositAmount.value=Number(r.professional_booking_deposit_amount||0);professionalDepositAmount.disabled=professionalPaymentMode.value!=="deposit"}
document.getElementById("professionalPaymentMode")?.addEventListener("change",e=>{professionalDepositAmount.disabled=e.target.value!=="deposit";if(e.target.value!=="deposit")professionalDepositAmount.value=0});
async function saveProfessionalBookingSettings(){
 if(!professionalGuard())return;const mode=professionalPaymentMode.value,row={professional_booking_auto_confirm:professionalAutoConfirm.checked,professional_booking_min_notice_hours:Math.max(0,Number(professionalMinNotice.value||0)),professional_booking_max_days:Math.max(1,Number(professionalMaxDays.value||60)),professional_booking_payment_mode:mode,professional_booking_deposit_required:mode==="deposit",professional_booking_deposit_amount:mode==="deposit"?Math.max(0,Number(professionalDepositAmount.value||0)):0,updated_at:new Date().toISOString()};if(mode==="deposit"&&row.professional_booking_deposit_amount<=0)return toast("Indica el monto del anticipo");const {error}=await sb.from("restaurants").update(row).eq("id",currentRestaurant).eq("business_type","professional");if(error)return professionalError("booking_settings_save",error);Object.assign(currentRestaurantConfig||{},row);toast("Configuración de reservas guardada")
}
function syncProfessionalAppointmentFilters(){const select=document.getElementById("professionalAppointmentProviderFilter"),current=select?.value||"all";if(select){select.innerHTML='<option value="all">Todos</option>'+professionalProviders.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join("");select.value=[...select.options].some(x=>x.value===current)?current:"all"}const date=document.getElementById("professionalAppointmentDateFilter");if(date&&!date.value)date.value=professionalDateKey()}
function renderProfessionalPaymentIntents(){
 const list=document.getElementById("professionalPaymentIntentList");if(!list)return;
 const rows=professionalPaymentIntents.filter(x=>["pending","processing"].includes(String(x.status||""))&&new Date(x.expires_at).getTime()>Date.now());
 list.innerHTML=rows.map(i=>{const sv=professionalService(i.service_id),p=professionalProvider(i.provider_id),method=String(i.payment_method||""),isManual=!!method&&method.toLowerCase()!=="mercado pago",expires=new Intl.DateTimeFormat(currentRestaurantConfig?.locale||"es-CL",{timeZone:professionalTimeZone(),hour:"2-digit",minute:"2-digit"}).format(new Date(i.expires_at));return '<article class="item"><div class="row between"><div><div class="row" style="gap:8px;flex-wrap:wrap"><h3 style="margin:0">'+esc(i.customer_name)+'</h3><span class="pill">Pago pendiente · '+money(i.amount_due)+'</span></div><div class="mut" style="margin-top:6px">'+esc(sv?.name||"Servicio")+' · '+esc(p?.name||"Profesional")+'</div><div><b>'+esc(professionalDateTime(i.starts_at))+'</b> · '+(method?esc(method):'Método aún no elegido')+'</div><div class="mut">'+esc([i.customer_phone,i.customer_email].filter(Boolean).join(" · ")||"Sin contacto")+' · vence '+esc(expires)+'</div><div class="mut" style="margin-top:5px"><b>No es una reserva todavía.</b> La cita se crea únicamente al validar el pago.</div></div><div class="actions">'+(isManual?'<button class="primary" type="button" onclick="approveProfessionalPaymentIntent('+i.id+')">Confirmar pago y crear reserva</button>':'<span class="pill">'+(method.toLowerCase()==="mercado pago"?'Esperando Mercado Pago':'Esperando al cliente')+'</span>')+'</div></div></article>'}).join("")||'<p class="mut">No hay pagos pendientes de verificación.</p>';
}
async function approveProfessionalPaymentIntent(id){
 const intent=professionalPaymentIntents.find(x=>Number(x.id)===Number(id));if(!intent)return;
 if(!confirm("¿Confirmar que recibiste "+money(intent.amount_due||0)+" por "+String(intent.payment_method||"este método")+"? Al confirmar se creará la reserva."))return;
 const {data,error}=await sb.rpc("approve_professional_booking_manual_payment",{p_intent_id:id});
 if(error)return professionalError("booking_payment_approve",error);
 await loadProfessionalAppointments();trackRestaurantEvent?.("professional_payment_approved","appointments",{payment_intent_id:id,appointment_id:data?.appointment_id,paid_amount:intent.amount_due});toast("Pago confirmado y reserva creada")
}
function renderProfessionalAppointments(){
 const list=document.getElementById("professionalAppointmentList");if(!list)return;const date=document.getElementById("professionalAppointmentDateFilter")?.value||"",status=document.getElementById("professionalAppointmentStatusFilter")?.value||"active",provider=document.getElementById("professionalAppointmentProviderFilter")?.value||"all",active=new Set(["pending","confirmed","in_service"]),view=professionalAppointments.filter(a=>(!date||professionalDateKey(a.starts_at)===date)&&(status==="all"||(status==="active"?active.has(a.status):a.status===status))&&(provider==="all"||Number(a.provider_id)===Number(provider))).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
 const m=professionalReportSummary||{},set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};set("professionalTodayCount",Number(m.today_count||0));set("professionalUpcomingCount",Number(m.upcoming_count||0));set("professionalCompletedCount",Number(m.completed_count||0));set("professionalNoShowCount",Number(m.no_show_count||0));
 list.innerHTML=view.map(a=>{const sv=professionalService(a.service_id),p=professionalProvider(a.provider_id),canMove=["pending","confirmed"].includes(a.status),pay=professionalPaymentLabel(a),due=Number(a.payment_amount_due||0),paid=Number(a.paid_amount||0),method=String(a.payment_method||""),canApproveManual=a.payment_status==="pending"&&due>0&&method&&method.toLowerCase()!=="mercado pago",payAmount=a.payment_status==="approved"?paid:due;return '<article class="item"><div class="row between"><div><div class="row" style="gap:8px;flex-wrap:wrap"><h3 style="margin:0">'+esc(a.customer_name)+'</h3><span class="pill">'+esc(PROFESSIONAL_STATUS_LABELS[a.status]||a.status)+'</span><span class="pill">'+esc(pay)+(payAmount>0?' · '+esc(money(payAmount)):'')+'</span></div><div class="mut" style="margin-top:6px">'+esc(sv?.name||"Servicio")+' · '+esc(p?.name||"Profesional")+'</div><div><b>'+esc(professionalDateTime(a.starts_at))+'</b> · Total '+money(a.total_amount)+(method?' · '+esc(method):'')+'</div><div class="mut">'+esc([a.customer_phone,a.customer_email].filter(Boolean).join(" · ")||"Sin contacto")+(a.notes?' · '+esc(a.notes):'')+'</div></div><div class="actions">'+(canApproveManual?'<button class="primary" type="button" onclick="approveProfessionalManualPayment('+a.id+')">Marcar pagado</button>':'')+(canMove?'<button class="ghost" type="button" onclick="openProfessionalRescheduleModal('+a.id+')">Reprogramar</button>':'')+'<select aria-label="Cambiar estado" onchange="changeProfessionalAppointmentStatus('+a.id+',this.value)">'+Object.entries(PROFESSIONAL_STATUS_LABELS).map(([value,label])=>'<option value="'+value+'" '+(a.status===value?'selected':'')+'>'+label+'</option>').join("")+'</select></div></div></article>'}).join("")||'<p class="mut">No hay citas con estos filtros.</p>';
}
async function approveProfessionalManualPayment(id){
 const appointment=professionalAppointments.find(x=>Number(x.id)===Number(id));if(!appointment)return;
 if(!confirm("¿Confirmar que recibiste "+money(appointment.payment_amount_due||0)+" por "+String(appointment.payment_method||"este método")+"?"))return;
 const {data,error}=await sb.rpc("approve_professional_appointment_manual_payment",{p_appointment_id:id});
 if(error)return professionalError("appointment_payment_approve",error);
 await loadProfessionalAppointments();trackRestaurantEvent?.("professional_payment_approved","appointments",{appointment_id:id,paid_amount:data?.paid_amount});toast("Pago confirmado")
}
async function changeProfessionalAppointmentStatus(id,status){
 const appointment=professionalAppointments.find(x=>Number(x.id)===Number(id));if(!appointment)return;
 if(status==="cancelled"&&appointment.payment_status==="approved"&&!confirm("Esta cita tiene un pago aprobado. Cambiarla a Cancelada NO realiza un reembolso automático. ¿Continuar?")){renderProfessionalAppointments();return}
 const {error}=await sb.from("professional_appointments").update({status,updated_at:new Date().toISOString()}).eq("id",id).eq("restaurant_id",currentRestaurant);if(error)return professionalError("appointment_status",error);await loadProfessionalAppointments();toast("Estado actualizado")
}
async function openProfessionalRescheduleModal(id){
 const a=professionalAppointments.find(x=>Number(x.id)===Number(id));if(!a)return;if(!["pending","confirmed"].includes(a.status))return toast("Solo puedes reprogramar citas pendientes o confirmadas");
 const sv=professionalService(a.service_id),p=professionalProvider(a.provider_id);if(!sv||!p)return toast("No se pudo identificar servicio o profesional");
 professionalRescheduleAppointmentId.value=a.id;professionalRescheduleSummary.textContent=a.customer_name+" · "+sv.name+" · "+p.name;const currentDate=professionalDateKey(a.starts_at),today=professionalDateKey();professionalRescheduleDate.value=currentDate<today?today:currentDate;professionalRescheduleDate.min=today;const max=new Date();max.setUTCDate(max.getUTCDate()+Number(currentRestaurantConfig?.professional_booking_max_days||60));professionalRescheduleDate.max=max.toISOString().slice(0,10);professionalModal("professionalRescheduleModal",true);await loadProfessionalRescheduleSlots();
}
function closeProfessionalRescheduleModal(){professionalModal("professionalRescheduleModal",false)}
async function loadProfessionalRescheduleSlots(){
 const id=Number(professionalRescheduleAppointmentId.value),a=professionalAppointments.find(x=>Number(x.id)===id),select=document.getElementById("professionalRescheduleSlot");if(!a||!select)return;const date=professionalRescheduleDate.value;if(!date)return;
 select.innerHTML='<option value="">Buscando horarios…</option>';const {data,error}=await sb.rpc("get_professional_available_slots",{p_restaurant_id:currentRestaurant,p_service_id:Number(a.service_id),p_provider_id:Number(a.provider_id),p_date:date});if(error){select.innerHTML='<option value="">No se pudieron cargar los horarios</option>';return professionalError("appointment_reschedule_slots",error)}
 const rows=data||[];select.innerHTML=rows.length?'<option value="">Selecciona una hora nueva</option>'+rows.map(x=>'<option value="'+esc(x.slot_start)+'">'+new Intl.DateTimeFormat(currentRestaurantConfig?.locale||"es-CL",{timeZone:professionalTimeZone(),hour:"2-digit",minute:"2-digit"}).format(new Date(x.slot_start))+'</option>').join(""):'<option value="">Sin horarios disponibles</option>';
}
async function saveProfessionalReschedule(){
 const id=Number(professionalRescheduleAppointmentId.value),a=professionalAppointments.find(x=>Number(x.id)===id),starts=professionalRescheduleSlot.value;if(!a||!starts)return toast("Selecciona una nueva fecha y hora");
 const btn=document.querySelector('#professionalRescheduleModal button[onclick="saveProfessionalReschedule()"]');if(btn?.disabled)return;if(btn){btn.disabled=true;btn.textContent="Reprogramando…"}
 try{const {error}=await sb.rpc("reschedule_professional_appointment",{p_appointment_id:id,p_starts_at:starts});if(error)throw error;closeProfessionalRescheduleModal();await loadProfessionalAppointments();trackRestaurantEvent?.("professional_appointment_rescheduled","appointments",{appointment_id:id});toast("Cita reprogramada")}catch(e){professionalError("appointment_reschedule",e)}finally{if(btn){btn.disabled=false;btn.textContent="Guardar nueva hora"}}
}

async function openProfessionalAppointmentModal(){if(!professionalGuard())return;if(!professionalServices.length||!professionalProviders.length)await loadProfessionalAppointments();const active=professionalServices.filter(x=>x.active),select=professionalAppointmentService;select.innerHTML=active.map(s=>'<option value="'+s.id+'">'+esc(s.name)+' · '+money(s.price)+'</option>').join("");if(!active.length)return toast("Primero crea un servicio activo");professionalAppointmentDate.value=professionalDateKey();professionalAppointmentDate.min=professionalDateKey();const max=new Date();max.setUTCDate(max.getUTCDate()+Number(currentRestaurantConfig?.professional_booking_max_days||60));professionalAppointmentDate.max=max.toISOString().slice(0,10);professionalAppointmentCustomerName.value="";professionalAppointmentCustomerPhone.value="";professionalAppointmentCustomerEmail.value="";professionalAppointmentNotes.value="";syncProfessionalAppointmentProviders();professionalModal("professionalAppointmentModal",true);await loadProfessionalAppointmentSlots()}
function closeProfessionalAppointmentModal(){professionalModal("professionalAppointmentModal",false)}
function syncProfessionalAppointmentProviders(){const serviceId=Number(professionalAppointmentService.value),allowed=new Set(professionalProviderServices.filter(x=>Number(x.service_id)===serviceId).map(x=>Number(x.provider_id))),rows=professionalProviders.filter(p=>p.active&&allowed.has(Number(p.id)));professionalAppointmentProvider.innerHTML=rows.map(p=>'<option value="'+p.id+'">'+esc(p.name)+(p.specialty?' · '+esc(p.specialty):'')+'</option>').join("")}
async function loadProfessionalAppointmentSlots(){const select=document.getElementById("professionalAppointmentSlot");if(!select)return;const serviceId=Number(professionalAppointmentService.value),providerId=Number(professionalAppointmentProvider.value),date=professionalAppointmentDate.value;if(!serviceId||!providerId||!date){select.innerHTML='<option value="">Completa servicio, profesional y fecha</option>';return}select.innerHTML='<option value="">Buscando horarios…</option>';const {data,error}=await sb.rpc("get_professional_available_slots",{p_restaurant_id:currentRestaurant,p_service_id:serviceId,p_provider_id:providerId,p_date:date});if(error){select.innerHTML='<option value="">No se pudieron cargar los horarios</option>';return professionalError("appointment_slots",error)}const rows=data||[];select.innerHTML=rows.length?'<option value="">Selecciona una hora</option>'+rows.map(x=>'<option value="'+esc(x.slot_start)+'">'+new Intl.DateTimeFormat(currentRestaurantConfig?.locale||"es-CL",{timeZone:professionalTimeZone(),hour:"2-digit",minute:"2-digit"}).format(new Date(x.slot_start))+'</option>').join(""):'<option value="">Sin horarios disponibles</option>'}
async function saveProfessionalAppointment(){const serviceId=Number(professionalAppointmentService.value),providerId=Number(professionalAppointmentProvider.value),starts=professionalAppointmentSlot.value,name=professionalAppointmentCustomerName.value.trim();if(!serviceId||!providerId||!starts)return toast("Selecciona servicio, profesional, fecha y hora");if(!name)return toast("Escribe el nombre del cliente");const btn=document.querySelector('#professionalAppointmentModal button[onclick="saveProfessionalAppointment()"]');if(btn?.disabled)return;if(btn){btn.disabled=true;btn.textContent="Creando…"}try{const {error}=await sb.rpc("create_professional_appointment",{p_restaurant_id:currentRestaurant,p_service_id:serviceId,p_provider_id:providerId,p_starts_at:starts,p_customer_name:name,p_customer_phone:professionalAppointmentCustomerPhone.value.trim(),p_customer_email:professionalAppointmentCustomerEmail.value.trim()||null,p_notes:professionalAppointmentNotes.value.trim()||null});if(error)throw error;closeProfessionalAppointmentModal();await loadProfessionalAppointments();trackRestaurantEvent?.("professional_appointment_created","appointments",{service_id:serviceId,provider_id:providerId});toast("Cita creada correctamente")}catch(e){professionalError("appointment_create",e)}finally{if(btn){btn.disabled=false;btn.textContent="Crear cita"}}}

function queueProfessionalClientSearch(){clearTimeout(professionalClientSearchTimer);professionalClientSearchTimer=setTimeout(()=>{professionalClientPage=1;loadProfessionalClients()},250)}
async function setProfessionalClientPage(page){professionalClientPage=Math.max(1,Number(page)||1);await loadProfessionalClients()}
async function loadProfessionalClients(){
 if(!professionalGuard())return;const box=document.getElementById("professionalClientList");if(box)box.innerHTML='<p class="mut">Cargando clientes…</p>';
 const search=String(document.getElementById("professionalClientSearch")?.value||"").trim();
 const {data,error}=await sb.rpc("professional_client_directory_page",{p_restaurant_id:currentRestaurant,p_limit:PROFESSIONAL_CLIENT_PAGE_SIZE,p_offset:(professionalClientPage-1)*PROFESSIONAL_CLIENT_PAGE_SIZE,p_search:search||null});
 if(error)return professionalError("clients_load",error);const payload=data||{};professionalClients=payload.rows||[];professionalClientTotal=Number(payload.total||0);
 const pages=Math.max(1,Math.ceil(professionalClientTotal/PROFESSIONAL_CLIENT_PAGE_SIZE));if(professionalClientPage>pages){professionalClientPage=pages;return loadProfessionalClients()}
 renderProfessionalClients()
}
function renderProfessionalClients(){
 const box=document.getElementById("professionalClientList");if(!box)return;
 box.innerHTML=professionalClients.map(c=>'<div class="item row between"><div><b>'+esc(c.customer_name||"Cliente")+'</b><div class="mut">'+esc([c.customer_phone,c.customer_email].filter(Boolean).join(" · ")||"Sin contacto")+'</div><div class="mut">Última cita: '+esc(professionalDateTime(c.last_appointment))+'</div></div><div style="text-align:right"><span class="pill">'+Number(c.appointment_count||0)+' citas</span><div class="mut" style="margin-top:6px">Completado: '+money(c.completed_total||0)+'</div></div></div>').join("")||'<p class="mut">Los clientes aparecerán cuando registres reservas.</p>';
 const pager=document.getElementById("professionalClientPager");if(pager){const pages=Math.max(1,Math.ceil(professionalClientTotal/PROFESSIONAL_CLIENT_PAGE_SIZE)),from=professionalClientTotal?(professionalClientPage-1)*PROFESSIONAL_CLIENT_PAGE_SIZE+1:0,to=Math.min(professionalClientPage*PROFESSIONAL_CLIENT_PAGE_SIZE,professionalClientTotal);pager.innerHTML='<span class="mut">Mostrando '+from+'–'+to+' de '+professionalClientTotal+'</span><div class="actions"><button class="ghost" '+(professionalClientPage<=1?'disabled':'')+' onclick="setProfessionalClientPage('+(professionalClientPage-1)+')">← Anterior</button><span class="pill">Página '+professionalClientPage+' / '+pages+'</span><button class="ghost" '+(professionalClientPage>=pages?'disabled':'')+' onclick="setProfessionalClientPage('+(professionalClientPage+1)+')">Siguiente →</button></div>'}
}
async function loadProfessionalReport(){if(!professionalGuard())return;try{if(!professionalServices.length)await loadProfessionalServices();await fetchProfessionalReportSummary();renderProfessionalReports()}catch(e){professionalError("reports_load",e)}}
function renderProfessionalReports(){const metrics=document.getElementById("professionalReportMetrics"),list=document.getElementById("professionalReportList");if(!metrics||!list)return;const m=professionalReportSummary||{},top=Array.isArray(m.top_services)?m.top_services:[];metrics.innerHTML='<article class="restaurant-metric"><span>Total citas · '+PROFESSIONAL_REPORT_DAYS+' días</span><strong>'+Number(m.total_count||0)+'</strong></article><article class="restaurant-metric"><span>Completadas</span><strong>'+Number(m.completed_count||0)+'</strong></article><article class="restaurant-metric"><span>Ingresos</span><strong>'+money(m.revenue||0)+'</strong></article><article class="restaurant-metric"><span>Canceladas / no asistió</span><strong>'+(Number(m.cancelled_count||0)+Number(m.no_show_count||0))+'</strong></article>';list.innerHTML=top.map((x,i)=>'<div class="item row between"><div><b>'+(i+1)+'. '+esc(x.service_name||professionalService(x.service_id)?.name||"Servicio")+'</b><div class="mut">Reservas en los últimos '+PROFESSIONAL_REPORT_DAYS+' días</div></div><span class="pill">'+Number(x.count||0)+'</span></div>').join("")||'<p class="mut">Aún no hay datos para el reporte.</p>'}
async function refreshProfessionalDashboard(){
 try{if(!professionalServices.length)await loadProfessionalServices();await fetchProfessionalReportSummary()}catch(e){return professionalError("dashboard_load",e)}
 const m=professionalReportSummary||{},statusRows=Array.isArray(m.status_counts)?m.status_counts:[],topRows=Array.isArray(m.top_services)?m.top_services:[],set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
 set("statOrdersToday",Number(m.today_count||0));set("statProducts",professionalServices.filter(x=>x.active).length);set("statSalesToday",money(m.revenue||0));set("statAverage",money(m.average_completed||0));const labels=document.querySelectorAll("#dashboard .restaurant-metric span");if(labels[0])labels[0].textContent="Ingresos · "+PROFESSIONAL_REPORT_DAYS+" días";if(labels[1])labels[1].textContent="Citas de hoy";if(labels[2])labels[2].textContent="Servicios activos";if(labels[3])labels[3].textContent="Promedio por cita";const hero=document.querySelector("#dashboard .restaurant-dashboard-hero p");if(hero)hero.textContent="Agenda, clientes, profesionales y servicios sin mezclar información de otros rubros.";const quick=document.querySelector("#dashboard .dashboard-quick-actions");if(quick)quick.innerHTML='<button type="button" class="dashboard-quick-action" onclick="document.querySelector(\'.tab[data-tab=&quot;appointments&quot;]\')?.click()"><span>📅</span><div><b>Agenda</b><small>'+Number(m.today_count||0)+' citas de hoy · '+Number(m.upcoming_count||0)+' próximas</small></div><i>›</i></button><button type="button" class="dashboard-quick-action" onclick="document.querySelector(\'.tab[data-tab=&quot;services&quot;]\')?.click()"><span>✦</span><div><b>Servicios</b><small>Precios y duración</small></div><i>›</i></button><button type="button" class="dashboard-quick-action" onclick="document.querySelector(\'.tab[data-tab=&quot;professionals&quot;]\')?.click()"><span>👤</span><div><b>Profesionales</b><small>Equipo y horarios</small></div><i>›</i></button>';const status=document.getElementById("statusChart");if(status){status.innerHTML=statusRows.map(x=>'<div class="item row between"><b>'+esc(PROFESSIONAL_STATUS_LABELS[x.status]||x.status)+'</b><span class="pill">'+Number(x.count||0)+'</span></div>').join("")||'<p class="mut">Sin citas todavía.</p>'}const top=document.getElementById("topProducts"),title=top?.closest("article")?.querySelector("h2");if(title)title.textContent="Servicios más reservados";if(top){top.innerHTML=topRows.slice(0,5).map((x,i)=>'<div class="item row between"><b>'+(i+1)+'. '+esc(x.service_name||professionalService(x.service_id)?.name||"Servicio")+'</b><span class="pill">'+Number(x.count||0)+' reservas</span></div>').join("")||'<p class="mut">Aún no hay reservas.</p>'}
}
