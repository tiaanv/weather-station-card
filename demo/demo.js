import '../dist/weather-station-card.js';
// Standalone helper stub: the missing-dependency test has no HA frontend.
window.loadCardHelpers=async()=>({createCardElement(){throw new Error('No history dependency in standalone demo');}});
const card=document.querySelector('weather-station-card');
const ids={rain_today:'sensor.demo_rain_today',rain_rate:'sensor.demo_rain_rate',rain_last_hour:'sensor.demo_rain_hour',rain_this_week:'sensor.demo_rain_week',rain_this_month:'sensor.demo_rain_month',rain_total:'sensor.demo_rain_total',rain_last_detected:'sensor.demo_last_rain',wind_speed:'sensor.demo_wind',wind_direction_degrees:'sensor.demo_direction',temperature:'sensor.demo_temperature',pressure:'sensor.demo_pressure'};
const values={rain_today:4.2,rain_rate:.8,rain_last_hour:1.1,rain_this_week:12.8,rain_this_month:38.4,rain_total:287.9,rain_last_detected:'2026-10-21 08:00:00',wind_speed:8.4,wind_direction_degrees:45,temperature:22.4,pressure:1012.6};
const units={rain_today:'mm',rain_rate:'mm/h',rain_last_hour:'mm',rain_this_week:'mm',rain_this_month:'mm',rain_total:'mm',wind_speed:'km/h',wind_direction_degrees:'°',temperature:'°C',pressure:'hPa'};
const events=[];card.addEventListener('hass-more-info',e=>events.push(e.detail.entityId));
function show(entities=ids,patch={},unitPatch={}){card.setConfig({name:'Home weather',entities});card.hass={states:Object.fromEntries(Object.entries(ids).map(([key,id])=>[id,{entity_id:id,state:String(patch[key]??values[key]),attributes:{unit_of_measurement:unitPatch[key]??units[key]??''}}])),locale:{language:'en'},config:{time_zone:'UTC'}};}
document.querySelector('#all').onclick=()=>show();
document.querySelector('#rain').onclick=()=>show(Object.fromEntries(Object.entries(ids).filter(([key])=>key.startsWith('rain'))));
document.querySelector('#wind').onclick=()=>show({wind_speed:ids.wind_speed,wind_direction_degrees:ids.wind_direction_degrees});
document.querySelector('#empty').onclick=()=>show({});
document.querySelector('#unavailable').onclick=()=>show(ids,Object.fromEntries(Object.keys(ids).map(key=>[key,'unavailable'])));
document.querySelector('#units').onclick=()=>show(ids,{}, {rain_today:'in',rain_rate:'in/h',rain_last_hour:'in',rain_this_week:'in',rain_this_month:'in',wind_speed:'mph',temperature:'°F',pressure:'inHg'});
const settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
async function runChecks(){const checks=[];const check=(name,value)=>{if(!value)throw new Error(name);checks.push('PASS '+name);};const q=selector=>card.shadowRoot.querySelector(selector);
try{
show();await settle();check('all primary measurements present',q('[data-entity="wind"]')&&q('[data-entity="temperature"]')&&q('[data-entity="pressure"]'));
check('rain status pill removed',!q('.badge'));check('quality removed',!card.shadowRoot.textContent.includes('Direction average quality'));
q('[data-entity="wind"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));check('speed history target',events.at(-1)===ids.wind_speed);
q('[data-entity="temperature"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));check('keyboard history target',events.at(-1)===ids.temperature);
document.querySelector('#wind').click();await settle();check('omitted rain instrument removed',!q('[data-instrument="rain"]'));check('omitted temperature removed',!q('[data-entity="temperature"]'));check('wind instruments remain',q('.rotor')&&q('.wind-vane'));
document.querySelector('#rain').click();await settle();check('omitted vane and rotor removed',!q('.rotor')&&!q('.wind-vane'));check('rain remains',q('[data-entity="today"]'));
document.querySelector('#units').click();await settle();check('entity speed unit',q('[data-entity="wind"]').textContent.includes('mph'));check('entity rain unit',q('[data-entity="today"]').textContent.includes('in'));check('entity pressure unit',q('[data-entity="pressure"]').textContent.includes('inHg'));
document.querySelector('#unavailable').click();await settle();check('unavailable is a dash',q('[data-entity="wind"]').textContent.includes('—'));
document.querySelector('#empty').click();await settle();check('empty config has hint and no readings',!q('[data-entity]')&&card.shadowRoot.textContent.includes('Configure sensor entities'));
show();await settle();const arm=q('[data-arm="0"]'),cup=q('[data-cup="0"]'),m=cup.getAttribute('transform').match(/translate\(([^ ]+) ([^)]+)\)/);check('cup and arm share attachment',Math.abs(+m[1]-+arm.getAttribute('x2'))<.001&&Math.abs(+m[2]-+arm.getAttribute('y2'))<.001);
const initial=cup.getAttribute('transform');await new Promise(r=>setTimeout(r,120));check('wind cups animate',q('[data-cup="0"]').getAttribute('transform')!==initial);
show(ids,{wind_speed:0,rain_rate:0});await settle();const stopped=q('[data-cup="0"]').getAttribute('transform');await new Promise(r=>setTimeout(r,80));check('zero wind pauses cups',q('[data-cup="0"]').getAttribute('transform')===stopped);check('dry hides rain',getComputedStyle(q('.rain-lines')).opacity==='0');
// Update hass without resetting config: this is how a real dry-to-rain transition arrives.
const nextRain=value=>{const states={...card._hass.states,[ids.rain_rate]:{entity_id:ids.rain_rate,state:String(value),attributes:{unit_of_measurement:'mm/h'}}};card.hass={...card._hass,states};};
nextRain(1.2);await settle();check('rain appears on live dry-to-wet update',getComputedStyle(q('.rain-lines')).opacity==='0.7');
const dash=getComputedStyle(q('.rain-lines')).strokeDashoffset;await new Promise(r=>setTimeout(r,100));check('rain dashes move while raining',getComputedStyle(q('.rain-lines')).strokeDashoffset!==dash);
nextRain(0);await settle();check('rain hides on live wet-to-dry update',getComputedStyle(q('.rain-lines')).opacity==='0');
nextRain('unavailable');await settle();check('unavailable rate hides rain',getComputedStyle(q('.rain-lines')).opacity==='0');
nextRain(.2);await settle();check('rain recovers after unavailable rate',getComputedStyle(q('.rain-lines')).opacity==='0.7');

show(ids,{wind_direction_degrees:0});await settle();let tip=q('.wind-vane polygon:last-child').getAttribute('points').split(' ').slice(0,2).map(Number);check('north points away',tip[1]<193);
show(ids,{wind_direction_degrees:180});await settle();tip=q('.wind-vane polygon:last-child').getAttribute('points').split(' ').slice(0,2).map(Number);check('south points toward viewer',tip[1]>193);
show();document.querySelector('#results').textContent=checks.join('\n')+'\n'+checks.length+' checks passed';return checks;
}catch(error){document.querySelector('#results').textContent=checks.join('\n')+'\nFAIL '+error.message;throw error;}}
document.querySelector('#checks').onclick=()=>runChecks().catch(()=>{});
window.demo={card,show,runChecks,ids,values,units};show();
