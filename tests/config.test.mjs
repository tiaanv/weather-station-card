import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context={HTMLElement:class{attachShadow(){this.shadowRoot={};}},clearInterval,customElements:{get(){return false;},define(){}},window:{}};
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../dist/weather-station-card.js',import.meta.url),'utf8')+'\nglobalThis.Card=WeatherStationCard;',context);
function card(config={}){const c=new context.Card();c.render=()=>{};c.setConfig(config);return c;}
test('empty configuration accepts every optional entity',()=>{const c=card();assert.equal(Object.values(c.config.entities).filter(Boolean).length,0);});
test('canonical names map to supplied entity IDs',()=>{const c=card({entities:{rain_today:'sensor.r',wind_speed:'sensor.w',pressure:'sensor.p'}});assert.equal(c.config.entities.today,'sensor.r');assert.equal(c.config.entities.wind,'sensor.w');assert.equal(c.config.entities.pressure,'sensor.p');});
test('legacy names remain aliases; canonical names take precedence',()=>{const c=card({entities:{wind_speed:'sensor.new',wind_speed_kmh:'sensor.old',rain_mm_today:'sensor.r'}});assert.equal(c.config.entities.wind,'sensor.new');assert.equal(c.config.entities.today,'sensor.r');});
test('direction quality is ignored',()=>assert.equal(Object.hasOwn(card({entities:{wind_direction_quality_percent:'sensor.q'}}).config.entities,'direction_quality'),false));
test('entity units win; absent units are not fabricated',()=>{const c=card({entities:{pressure:'sensor.p'}});c._hass={states:{'sensor.p':{state:'29.7',attributes:{unit_of_measurement:'inHg'}}}};assert.equal(c.unit('pressure','hPa'),'inHg');assert.equal(c.unit('wind','km/h'),'');});
test('missing, unknown and malformed numbers are unavailable',()=>{const c=card({entities:{wind_speed:'sensor.w'}});for(const value of ['unavailable','unknown','','NaN','Infinity']){c._hass={states:{'sensor.w':{state:value}}};assert.equal(c.number('wind'),null);}assert.equal(c.number('pressure'),null);});
test('numeric zero is retained',()=>{const c=card({entities:{wind_speed:'sensor.w'}});c._hass={states:{'sensor.w':{state:'0'}}};assert.equal(c.number('wind'),0);});
test('headings and sensor strings are escaped',()=>assert.equal(card().esc('<img onerror="x">&'), '&lt;img onerror=&quot;x&quot;&gt;&amp;'));
test('history can be disabled',()=>assert.equal(card({show_history:false}).config.show_history,false));
