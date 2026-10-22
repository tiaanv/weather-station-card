/* Weather station graphical card — v1.3.2. */
const WEATHER_STATION_CARD_VERSION='1.3.2';
class WeatherStationCard extends HTMLElement {
  setConfig(config) {
    const entityKeys={"today": ["rain_today", "rain_mm_today", "today"], "rate": ["rain_rate", "rain_rate_mm_per_hour", "rate"], "hour": ["rain_last_hour", "rain_mm_last_hour", "hour"], "week": ["rain_this_week", "rain_mm_this_week", "week"], "month": ["rain_this_month", "rain_mm_this_month", "month"], "total": ["rain_total", "rain_mm_total", "total"], "last_rain": ["rain_last_detected", "last_rain"], "wind": ["wind_speed", "wind_speed_kmh", "wind"], "direction": ["wind_direction_degrees", "direction"], "temperature": ["temperature", "temperature_celsius"], "pressure": ["pressure", "pressure_hpa"]};
    const entities=Object.fromEntries(Object.entries(entityKeys).map(([internal,keys])=>[internal,keys.map(key=>config.entities?.[key]).find(id=>typeof id==='string'&&id.trim())]));
    clearInterval(this._historyTimer);this._historyTimer=null;
    this._historyPanel?.remove();this._historyPanel=null;this._historyCards=null;this._stateSignature=null;
    this.config = {name:'Weather station',show_history:true, ...config, entities};
    if (!this.shadowRoot) this.attachShadow({mode:'open'});
    this.render();
  }
  set hass(hass) {
    this._hass=hass;
    if(!this.config)return;
    const signature=JSON.stringify(Object.values(this.config.entities).map(id=>{
      const state=hass?.states?.[id];
      return [state?.state,state?.attributes?.unit_of_measurement];
    }));

    if(signature===this._stateSignature)return;
    this._stateSignature=signature;
    this.render();
  }
  getCardSize(){return 8;}
  entity(key){return this._hass?.states?.[this.config.entities[key]];}
  number(key){const s=this.entity(key)?.state;return s!=null&&String(s).trim()!==''&&Number.isFinite(Number(s))?Number(s):null;}
  value(key, decimals=1){const n=this.number(key);return n===null?'—':n.toLocaleString(undefined,{maximumFractionDigits:decimals,minimumFractionDigits:decimals});}
  defined(key){return !!this.config.entities[key];}
  unit(key){return this.entity(key)?.attributes?.unit_of_measurement??'';}
  esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  graphicReading(key,label,unit,x,y,secondary='',align='start') {
    if(!this.defined(key))return '';
    return `<g class="graphic-reading" data-entity="${key}" role="button" tabindex="0" aria-label="${this.esc(label)}: ${this.value(key)} ${this.esc(this.unit(key,unit))}"><rect x="${align==='end'?x-117:x-5}" y="${y-13}" width="122" height="${secondary?64:48}" rx="5" fill="transparent"/><text x="${x}" y="${y}" text-anchor="${align}" class="art-label">${label}</text><text x="${x}" y="${y+26}" text-anchor="${align}" class="art-value">${this.value(key)} <tspan class="art-unit">${this.esc(this.unit(key,unit))}</tspan></text>${secondary}</g>`;
  }
  disconnectedCallback(){cancelAnimationFrame(this._frame);this._lastMotion=null;this._resizeObserver?.disconnect();clearInterval(this._historyTimer);this._historyTimer=null;}
  connectedCallback(){if(this.config){this._startMotion();this._watchWidth();this._startHistoryTimer();}}
  _startHistoryTimer(){
    if(this._historyTimer||!this._historyCards)return;
    this._historyTimer=setInterval(()=>{this._historyCards?.forEach(card=>{card.hass=this._hass;});this._updateTimeLabels();},60000);
  }
  _updateTimeLabels(){
    const format=new Intl.DateTimeFormat(this._hass?.locale?.language||'en',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:this._hass?.config?.time_zone||undefined});
    const now=Date.now();
    this._historyPanel?.querySelectorAll('.time-axis').forEach(axis=>{
      axis.replaceChildren(...[12,6,0].map(hours=>{const label=document.createElement('span');label.textContent=format.format(new Date(now-hours*3600000));return label;}));
    });
  }
  _watchWidth(){
    this._resizeObserver??=new ResizeObserver(entries=>{
      const wide=entries[0].contentRect.width>=820;
      if(wide&&this.config.show_history!==false&&!this._historyPanel)this._loadHistory();
    });
    this._resizeObserver.observe(this);
    if(this.config.show_history!==false&&this.getBoundingClientRect().width>=820&&!this._historyPanel)this._loadHistory();
  }
  async _fitHistoryGraph(card){
    await customElements.whenDefined('mini-graph-card');
    await card.updateComplete;
    if(!card.shadowRoot)return;
    const style=document.createElement('style');
    style.textContent=`:host{display:block;height:100%;min-height:0}
      ha-card{height:100%;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden}
      .header{flex:0 0 auto;padding:9px 12px 0!important}
      .states{flex:0 0 auto;padding:4px 12px!important}
      .graph{flex:1 1 0;min-height:0;height:auto!important;margin:0 10px 4px!important}
      .graph__container{position:relative;height:100%!important;padding:0!important}
      .graph__container__svg{position:absolute!important;inset:0!important;height:100%!important;padding:0!important}
      .graph__container__svg svg{position:absolute;inset:0;width:100%;height:100%}
      .graph__labels{font-size:10px!important}`;
    card.shadowRoot.append(style);
    card.shadowRoot.querySelector('svg')?.setAttribute('preserveAspectRatio','none');
  }
  async _loadHistory(){
    if(this.config.show_history===false||this._historyLoading||!this._hass?.callWS||!['rate','today','wind','temperature','pressure'].some(key=>this.defined(key)))return;
    this._historyLoading=true;
    try{
      const helpers=await window.loadCardHelpers();
      if(!customElements.get('mini-graph-card')){
        const warning=document.createElement('section');warning.className='history-panel';
        warning.textContent='Install Mini Graph Card to show history, or set show_history: false.';
        this._historyPanel=warning;this.shadowRoot.querySelector('.history-slot')?.replaceChildren(warning);return;
      }
      const panel=document.createElement('section');panel.className='history-panel';
      panel.setAttribute('aria-label','Weather history, last 12 hours');
      const title=document.createElement('div');title.className='history-title';title.textContent='LAST 12 HOURS';panel.append(title);
      this._historyCards=[];
      for(const [key,title] of [[this.defined('rate')?'rate':'today',this.defined('rate')?'Rain rate':'Rain today'],['wind','Speed'],['temperature','Temperature'],['pressure','Pressure']]){
        const entity=this.config.entities[key];if(!entity)continue;
        const card=helpers.createCardElement({type:'custom:mini-graph-card',name:title,entities:[{entity,name:title}],hours_to_show:12,points_per_hour:4,update_interval:60,animate:false,height:65,font_size_header:13,line_width:2,font_size:70,decimals:1,show:{icon:false,legend:false,labels:true,fill:'fade',points:false,loading_indicator:false},line_color:'#4aa9e7'});
        card.hass=this._hass;this._historyCards.push(card);
        const tile=document.createElement('div');tile.className='history-tile';
        const axis=document.createElement('div');axis.className='time-axis';axis.setAttribute('aria-label','History time scale');
        tile.append(card,axis);panel.append(tile);
        this._fitHistoryGraph(card);
      }
      this._startHistoryTimer();
      this._historyPanel=panel;
      this._updateTimeLabels();
      this.shadowRoot.querySelector('.history-slot')?.replaceChildren(panel);
    }catch(error){
      const slot=this.shadowRoot.querySelector('.history-slot');
      if(slot)slot.textContent='History could not load. Reopen the Weather page to retry.';
    }finally{this._historyLoading=false;}
  }
  setPreviewVaneCycle(enabled){this._cycleVane=!!enabled;this._cycleStart=performance.now();}
  _moveVane(direction){
    if(!this.defined('direction'))return;
    const a=direction*Math.PI/180, vx=Math.sin(a),vy=-Math.cos(a);
    const point=(along,across=0,height=0)=>[332+along*vx+across*Math.cos(a),193+.6*(along*vy+across*Math.sin(a))-height];
    const xy=p=>p.map(v=>v.toFixed(3)).join(' '),v=this.shadowRoot.querySelector('.wind-vane');
    if(!v)return;
    v.setAttribute('visibility','visible');
    v.querySelector('path').setAttribute('d',`M${xy(point(-29))} L${xy(point(39))}`);
    const polygons=v.querySelectorAll('polygon');
    polygons[0].setAttribute('points',[point(-13,0,1),point(-31,0,13),point(-31,0,1)].map(xy).join(' '));
    polygons[1].setAttribute('points',[point(39),point(25,7),point(28),point(25,-7)].map(xy).join(' '));
    const heading=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(direction/22.5)%16];
    const value=this.shadowRoot.querySelector('.direction-value');
    value.firstChild.textContent=heading+' ';
    value.querySelector('tspan').textContent=Math.round(direction)%360+'°';
    value.closest('[data-entity]').setAttribute('aria-label',`Direction: ${heading} ${Math.round(direction)%360} degrees`);
  }
  _startMotion(){
    cancelAnimationFrame(this._frame);
    const tick=now=>{
      const elapsed=this._lastMotion==null?0:Math.min((now-this._lastMotion)/1000,.1);
      this._lastMotion=now;
      const speed=this.number('wind'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._rotorPhase=(this._rotorPhase??0)+(speed>0&&!reduced?elapsed*2*Math.PI/Math.max(.7,12/speed):0);
      for(let i=0;i<3;i++){
        const a=this._rotorPhase+i*2*Math.PI/3,x=36*Math.cos(a),y=9.36*Math.sin(a),size=1+.07*Math.sin(a);
        const cup=this.shadowRoot.querySelector(`[data-cup="${i}"]`),arm=this.shadowRoot.querySelector(`[data-arm="${i}"]`);
        if(!cup||!arm)continue;
        // Both parts share exactly the same projected attachment point.
        arm.setAttribute('x2',x);arm.setAttribute('y2',y);
        cup.setAttribute('transform',`translate(${x} ${y}) scale(${size})`);
        cup.querySelector('.cup-face').setAttribute('transform',`scale(${Math.sin(a)} 1)`);
      }
      if(this._cycleVane)this._moveVane(((now-this._cycleStart)/20000*360)%360);
      this._frame=requestAnimationFrame(tick);
    };
    tick(performance.now());
  }
  render(){
    if(!this.config)return;
    const e=s=>this.esc(s), n=this.number('wind'), d=this.number('direction'), rain=this.number('rate');
    const heading=d===null?'—':['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(((d%360+360)%360)/22.5)%16];

    // Horizontal vane axis, projected with north receding into the picture.
    const angle=(d??0)*Math.PI/180, vx=Math.sin(angle), vy=-Math.cos(angle), depth=.60;
    const project=(along,across=0,height=0)=>[332+along*vx+across*Math.cos(angle),193+depth*(along*vy+across*Math.sin(angle))-height];
    const xy=p=>p.map(v=>v.toFixed(2)).join(' ');
    const tip=project(39), neck=project(25), tail=project(-29), hub=project(0);
    const arrow=[tip,project(25,7),project(28),project(25,-7)].map(xy).join(' ');
    const fin=[project(-13,0,1),project(-31,0,13),project(-31,0,1)].map(xy).join(' ');
    const open=this.shadowRoot.querySelector('details')?.open;
    const markup=`<style>
    :host{display:block;container-type:inline-size}*{box-sizing:border-box}ha-card{display:block;--surface:var(--ha-card-background,var(--card-background-color,#1c1c1e));--text:var(--primary-text-color,#e3e5e7);--muted:var(--secondary-text-color,#a3a6aa);--line:var(--divider-color,#35373a);--secondary:var(--secondary-background-color,#252527);--blue:var(--info-color,#4aa9e7);--frame:color-mix(in srgb,var(--text) 40%,var(--surface));background:var(--surface);color:var(--text);padding:18px 18px 6px;border-radius:14px;font:14px/1.45 var(--primary-font-family,Roboto,Arial,sans-serif);overflow:hidden;border:1px solid var(--line)}button{font:inherit;cursor:pointer;color:inherit}button:focus-visible,summary:focus-visible{outline:2px solid var(--blue);outline-offset:3px}header{display:flex;align-items:center;justify-content:space-between;gap:8px}header strong{font-size:16px;font-weight:500}.subtitle{font-size:11px;color:var(--muted);margin-top:2px}.stage{max-width:440px;margin:auto}.stage svg{width:100%;display:block;color:var(--frame)}.outline{stroke:currentColor;stroke-width:1.7;fill:none;stroke-linejoin:round;stroke-linecap:round}.accent{stroke:var(--blue);fill:none}.art-label{fill:var(--muted);font:11px Arial;letter-spacing:.8px}.art-value{fill:var(--text);font:500 29px Arial;font-variant-numeric:tabular-nums}.art-unit{fill:var(--muted);font:13px Arial}.graphic-reading{cursor:pointer}.graphic-reading:hover .art-value,.graphic-reading:focus .art-value{fill:var(--blue)}.graphic-reading:focus{outline:none}.graphic-reading:focus-visible rect{stroke:var(--blue)}.rain-caption{fill:var(--muted);font:13px Arial}.rain-number{fill:var(--text);font:14px Arial}.stage{border-bottom:1px solid var(--line);padding:10px 0 2px}.stage>svg{overflow:visible}.direction-value{fill:var(--text);font:500 29px Arial}.water{fill:var(--blue);opacity:.25}.rain-lines{stroke:var(--blue);stroke-width:1.3;stroke-linecap:round;stroke-dasharray:var(--rain-dashes);animation:rain var(--rain-speed) linear infinite;animation-delay:var(--rain-delay)}@keyframes rain{to{stroke-dashoffset:var(--rain-travel)}}details{border-top:1px solid var(--line)}summary{list-style:none;cursor:pointer;font-size:12px;color:var(--muted);padding:12px 0;display:flex;justify-content:space-between}summary::after{content:'⌄'}details[open] summary::after{content:'⌃'}.detail{width:100%;display:flex;justify-content:space-between;gap:12px;padding:6px 0;border:0;background:none;font-size:11px;color:var(--muted);text-align:left}.detail strong{font-weight:400;color:var(--text)}.source{font-size:10px;color:var(--muted);padding:10px 0;overflow-wrap:anywhere}button:hover{color:var(--blue)}@container(max-width:370px){ha-card{padding:15px 12px 5px}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}
    .station-layout{display:block}.station-layout.no-history{display:block}.no-history>.history-slot{display:none!important}.station-main{min-width:0}.history-slot{display:none}.history-panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-content:start}.history-tile{min-width:0;min-height:0;display:grid;grid-template-rows:minmax(0,1fr) 20px;overflow:hidden;background:var(--secondary);border-radius:10px}.history-tile>mini-graph-card{display:block;min-height:0;overflow:hidden;--ha-card-border-width:0;--ha-card-border-radius:10px;--ha-card-background:var(--secondary)}.time-axis{display:flex;justify-content:space-between;padding:0 12px 5px;font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}.history-title{grid-column:1/-1;color:var(--muted);font-size:11px;letter-spacing:.08em;padding:2px 0 0}.history-panel>hui-history-graph-card{display:block;min-width:0;--ha-card-border-radius:10px;--ha-card-background:var(--secondary)}@container(min-width:820px){.station-layout{display:grid;grid-template-columns:minmax(0,480px) minmax(0,1fr);gap:22px;align-items:start}.history-slot{display:block;min-width:0;position:relative;align-self:stretch;border-left:1px solid var(--line);padding-left:22px}.history-panel{position:absolute;inset:0 0 0 22px;grid-template-rows:20px repeat(2,minmax(0,1fr));overflow:hidden}.history-panel>mini-graph-card{min-height:0;overflow:hidden;--ha-card-border-radius:10px;--ha-card-background:var(--secondary)}.stage{max-width:440px}.station-main{padding-right:0}}
    .station-layout.no-history{display:block}.no-history>.history-slot{display:none!important}
    </style><ha-card><div class="station-layout"><div class="station-main"><header><div><strong>${e(this.config.name)}</strong><div class="subtitle">Measured at home</div></div></header>
    <div class="stage"><svg viewBox="0 0 520 340" role="group" aria-label="Weather station with readings beside each instrument">
    <defs><linearGradient id="metal" x1="0" x2="1"><stop stop-color="currentColor" stop-opacity=".10"/><stop offset=".5" stop-color="currentColor" stop-opacity=".02"/><stop offset="1" stop-color="currentColor" stop-opacity=".10"/></linearGradient><clipPath id="rain-window"><rect x="164" y="87" width="53" height="47"/></clipPath></defs>
    <!-- A single mast, a cup anemometer, rain collector and louvred sensor housing. -->
    <g class="outline">
      <path d="M265 ${this.defined('wind')?91:174}V273h8V${this.defined('wind')?91:174}" fill="url(#metal)"/>
      <path d="M247 276h44M254 272h30M${this.defined('today')||this.defined('rate')||this.defined('hour')||this.defined('week')||this.defined('month')?203:265} 174H${this.defined('direction')?332:273}M${this.defined('today')||this.defined('rate')||this.defined('hour')||this.defined('week')||this.defined('month')?203:265} 179H${this.defined('direction')?332:273}"/>
      <rect x="261" y="170" width="16" height="13" rx="3" fill="var(--surface)"/>
      <g data-instrument="rain"><path d="M190 170v-12m-27-20h54l-9 20h-36z" fill="url(#metal)"/>
      <ellipse cx="190" cy="137" rx="29" ry="5" fill="var(--surface)"/>
      <rect x="177" y="159" width="26" height="40" rx="5" fill="url(#metal)"/>
      <path d="M182 187h16v7h-16z" class="water" stroke="none"/>
      <path d="M185 164h10m-10 6h10m-10 6h10M190 199v5" opacity=".6"/>
      </g>
      <!-- Vane bearing seated on the cross-arm, with the rotor above it. -->
      <g data-instrument="direction" transform="translate(0 -40)">
      <path d="M329 193v22h6v-22" fill="var(--surface)"/>
      <ellipse cx="332" cy="217" rx="10" ry="3"/>
      <path d="M332 173v-6" opacity=".55"/>
      <text x="332" y="161" text-anchor="middle" stroke="none" class="art-label">N</text>
      <g class="wind-vane" visibility="${d===null?'hidden':'visible'}">
        <path d="M${xy(tail)} L${xy(tip)}"/>
        <polygon points="${fin}" fill="var(--surface)"/>
        <polygon points="${arrow}" fill="var(--blue)" stroke="var(--blue)" stroke-width="1"/>
      </g>
      <circle cx="332" cy="193" r="3" fill="var(--surface)"/>
      </g>
      <!-- Compact sensor enclosure on the mast. -->
      <g data-instrument="environment"><rect x="257" y="223" width="24" height="29" rx="4" fill="var(--surface)"/>
      <path d="M263 230h12m-12 5h12m-12 5h7" opacity=".6"/></g>
    </g>
    <!-- Side elevation: each cup travels along the horizontal circular orbit. -->
    <g data-instrument="wind" class="outline"><path d="M269 83v17"/><ellipse cx="269" cy="100" rx="8" ry="3" fill="var(--surface)"/></g>
    <g transform="translate(269 83)" class="rotor" data-instrument="wind">
      ${[0,1,2].map(index=>`<line class="outline rotor-arm" data-arm="${index}" x1="0" y1="0" x2="0" y2="0"/>`).join('')}
      ${[0,1,2].map(index=>`<g class="outline rotor-cup" data-cup="${index}"><g class="cup-face"><path d="M5-8C-13-8-13 8 5 8Z" fill="var(--surface)"/><ellipse cx="5" cy="0" rx="2.6" ry="8" fill="var(--secondary)"/></g></g>`).join('')}
      <circle r="4" fill="var(--surface)" stroke="var(--frame)" stroke-width="1.7"/>
    </g>
    <g data-instrument="rain" clip-path="url(#rain-window)">${[
      [168,2,23,.72,-.24,.48],[176,3,31,.93,-.68,.7],
      [183,2.5,26,.81,-.13,.56],[193,3.5,36,1.07,-.82,.65],
      [201,2,29,.86,-.51,.5],[211,3,25,.77,-.37,.68]
    ].map(([x,length,gap,speed,delay,alpha])=>`<path class="rain-lines" style="opacity:${rain>0?alpha:0};--rain-dashes:${length} ${gap};--rain-travel:-${length+gap};--rain-speed:${speed}s;--rain-delay:${delay}s" d="M${x} 48v112"/>`).join('')}</g>
    <g class="outline" opacity=".5"><path data-instrument="rain" d="M122 67h25l16 71"/><path data-instrument="wind" d="M310 83h34l12-12"/><path data-instrument="direction" d="M371 153h18"/><path data-instrument="pressure" d="M257 237h-42l-25 30"/><path data-instrument="temperature" d="M281 237h42l25 30"/></g>
    <g transform="translate(0 -58)">
    ${this.graphicReading('today','RAIN TODAY','mm',10,106)}
    <g data-entity="rate" class="graphic-reading" role="button" tabindex="0" aria-label="Rain rate"><rect x="5" y="143" width="130" height="23" fill="transparent"/><text x="10" y="158" class="rain-number" fill="var(--blue)">${this.value('rate')} <tspan class="rain-caption">${e(this.unit('rate','mm/h'))} now</tspan></text></g>
    ${[['hour','Last hour',185],['week','This week',207],['month','This month',229]].map(([key,label,y])=>`<g class="graphic-reading" data-entity="${key}" role="button" tabindex="0" aria-label="${label}: ${this.value(key)} ${e(this.unit(key,'mm'))}"><rect x="5" y="${y-14}" width="135" height="22" fill="transparent"/><text x="10" y="${y}" class="rain-caption">${label}</text><text x="136" y="${y}" text-anchor="end" class="rain-number">${this.value(key)} <tspan class="art-unit">${e(this.unit(key,'mm'))}</tspan></text></g>`).join('')}
    </g>
    ${this.graphicReading('wind','SPEED','km/h',364,48)}
    <g class="graphic-reading" data-entity="direction" role="button" tabindex="0" aria-label="Direction: ${heading} ${this.value('direction',0)} degrees"><rect x="390" y="119" width="118" height="60" fill="transparent"/><text x="396" y="141" class="art-label">DIRECTION</text><text x="396" y="167" class="direction-value">${heading} <tspan class="art-unit">${d===null?'':this.value('direction',0)+'°'}</tspan></text></g>
    ${this.graphicReading('pressure','PRESSURE','hPa',100,261)}
    ${this.graphicReading('temperature','TEMPERATURE','°C',354,267)}
    <text x="269" y="326" text-anchor="middle" class="art-label">HOME WEATHER STATION</text></svg></div>
    <details ${open?'open':''}><summary>Station details</summary>${[['rate','Rain rate','mm/h'],['total','Lifetime rain','mm']].filter(([key])=>this.defined(key)).map(([key,label,unit])=>`<button class="detail" data-entity="${key}"><span>${label}</span><strong>${this.value(key)} ${e(this.unit(key,unit))}</strong></button>`).join('')}<button class="detail" data-entity="last_rain"><span>Last rainfall</span><strong>${e(this.entity('last_rain')?.state??'Unavailable')}</strong></button><div class="source">Tap a reading to open its Home Assistant history.</div></details></div><aside class="history-slot" aria-label="History panel"></aside></div></ha-card>`;
    const template=document.createElement('template');template.innerHTML=markup;
    const rainConfigured=['today','rate','hour','week','month'].some(key=>this.defined(key));
    const features={rain:rainConfigured,wind:this.defined('wind'),direction:this.defined('direction'),environment:this.defined('temperature')||this.defined('pressure'),temperature:this.defined('temperature'),pressure:this.defined('pressure')};
    template.content.querySelectorAll('[data-instrument]').forEach(node=>{if(!features[node.dataset.instrument])node.remove();});
    template.content.querySelectorAll('[data-entity]').forEach(node=>{if(!this.defined(node.dataset.entity))node.remove();});
    if(!Object.values(this.config.entities).some(Boolean)){
      const empty=document.createElement('p');empty.className='source';empty.textContent='Configure sensor entities to display your weather station.';
      template.content.querySelector('.stage')?.replaceWith(empty);
    }
    if(!['rate','total','last_rain'].some(key=>this.defined(key)))template.content.querySelector('details')?.remove();
    const hasHistory=this.config.show_history!==false&&['rate','today','wind','temperature','pressure'].some(key=>this.defined(key));
    const existingMain=this.shadowRoot.querySelector('.station-main');
    if(existingMain)existingMain.replaceWith(template.content.querySelector('.station-main'));
    else this.shadowRoot.replaceChildren(template.content);
    this.shadowRoot.querySelector('.station-layout').classList.toggle('no-history',!hasHistory);
    if(this._historyPanel&&!this._historyPanel.isConnected)this.shadowRoot.querySelector('.history-slot').append(this._historyPanel);
    this._watchWidth();
    this._startMotion();
    this.shadowRoot.querySelectorAll('[data-entity]').forEach(button=>button.addEventListener('click',()=>{const id=this.config.entities[button.dataset.entity];if(id)this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:id},bubbles:true,composed:true}));}));
    this.shadowRoot.querySelectorAll('g[data-entity]').forEach(control=>control.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();control.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}));
  }
}
if(!customElements.get('weather-station-card'))customElements.define('weather-station-card',WeatherStationCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'weather-station-card',name:'Weather station',description:'Graphical weather station in the Jura card style.'});
