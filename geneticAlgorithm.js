/**
 * Genetic route optimization. Each chromosome is a point ordering; selection, ordered crossover, mutation, and elitism evolve shorter tours.
 */
import {createEvolution,evolve} from './evolution.mjs';
const map=document.getElementById('route-map'),chart=document.getElementById('fitness-chart');
const toggle=document.getElementById('toggle-run'),stepButton=document.getElementById('step');
const status=document.getElementById('evolution-status');
const palette=getComputedStyle(document.documentElement),
/**
 * Read a named color from the shared CSS palette.
 *
 * @param name - CSS custom-property name or display label used by this operation.
 * @returns CSS color string from the shared palette.
 */
color=name=>palette.getPropertyValue(name).trim();
let state,points=[],history=[],initialDistance=0,running=false,lastTime=0,accumulator=0;
/**
 * Read a control value as a number for the simulation settings.
 *
 * @param id - DOM element identifier used to find its control or canvas.
 * @returns Numeric value read from the control.
 */
const value=id=>Number(document.getElementById(id).value);
for(const id of ['cities','population','mutation','speed'])document.getElementById(id).addEventListener('input',()=>{document.getElementById(`${id}-value`).value=value(id)+(id==='mutation'?'%':'');});
/**
 * Pause simulation playback and restore the controls without discarding the current state.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function stop() {running=false;toggle.textContent='Start';stepButton.disabled=false;accumulator=0;}
/**
 * Pause playback and rebuild the population, optionally replacing the point map.
 *
 * @param newMap - Whether to replace point coordinates as well as restarting the optimizer. Default: false.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function restart(newMap=false) {
    stop();
    if(newMap || points.length!==value('cities')) points=Array.from({length:value('cities')},()=>({x:30+Math.random()*940,y:30+Math.random()*640}));
    state=createEvolution(points,value('population'));initialDistance=state.best.length;history=[{generation:0,length:initialDistance}];
    status.textContent='Ready. Start evolution or advance one generation.';draw();
}
/**
 * Evolve one generation and retain a bounded history for the fitness chart.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function advance() {
    evolve(state,value('mutation')/100);
    history.push({generation:state.generation,length:state.best.length});
    if(history.length>800)history=history.filter((_,i)=>i===0||i%2===1);
}
/**
 * Prepare a canvas at display resolution with a capped device pixel ratio.
 *
 * @param canvas - Canvas element whose dimensions and drawing context are being prepared.
 * @returns Canvas drawing context and its CSS width and height.
 */
function setup(canvas) {
    const width=canvas.clientWidth,height=canvas.clientHeight,ratio=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    return {ctx,width,height};
}
/**
 * Render the best closed tour, its improvement chart, and the current statistics.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function draw() {
    if(!state)return;
    const {ctx,width,height}=setup(map);
    const scale=Math.min(width/1000,height/700),ox=(width-1000*scale)/2,oy=(height-700*scale)/2;
    ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
    ctx.strokeStyle=color('--site-accent');ctx.lineWidth=2/scale;ctx.beginPath();
    state.best.route.forEach((id,index)=>{const p=points[id];if(index===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.stroke();
    points.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,4/scale,0,Math.PI*2);ctx.fillStyle=color('--site-text');ctx.fill();ctx.fillStyle=color('--site-muted');ctx.font=`${10/scale}px sans-serif`;ctx.fillText(String(i+1),p.x+8/scale,p.y-8/scale);});ctx.restore();
    const graph=setup(chart),c=graph.ctx,w=graph.width,h=graph.height;
    const min=Math.min(...history.map(p=>p.length)),max=initialDistance,range=Math.max(1,max-min);
    c.fillStyle=color('--site-muted');c.font='11px sans-serif';c.fillText(max.toFixed(0),4,14);c.fillText(min.toFixed(0),4,h-8);
    c.strokeStyle=color('--site-border');c.beginPath();c.moveTo(48,8);c.lineTo(48,h-15);c.lineTo(w-8,h-15);c.stroke();
    c.strokeStyle=color('--site-accent');c.lineWidth=2;c.beginPath();
    history.forEach((p,i)=>{const x=50+(w-60)*p.generation/Math.max(1,state.generation),y=12+(h-32)*(max-p.length)/range;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.stroke();
    document.getElementById('generation').textContent=state.generation;
    document.getElementById('best-distance').textContent=state.best.length.toFixed(1);
    document.getElementById('improvement').textContent=`${((1-state.best.length/initialDistance)*100).toFixed(1)}%`;
    map.setAttribute('aria-label',`Best route through ${points.length} points, generation ${state.generation}, distance ${state.best.length.toFixed(1)}.`);
}
toggle.addEventListener('click',()=>{if(running){stop();status.textContent='Paused.';}else{running=true;lastTime=performance.now();toggle.textContent='Pause';stepButton.disabled=true;status.textContent='Evolving routes…';}});
stepButton.addEventListener('click',()=>{advance();draw();status.textContent=`Generation ${state.generation} complete.`;});
document.getElementById('evolution-form').addEventListener('submit',event=>{event.preventDefault();restart(true);});
document.getElementById('restart').addEventListener('click',()=>restart());
// Recalculate view dimensions when the surrounding layout changes.
new ResizeObserver(draw).observe(map);new ResizeObserver(draw).observe(chart);
/**
 * Advance time-dependent simulation work and redraw the view on the next animation frame.
 *
 * @param time - Animation-frame timestamp in milliseconds.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function animate(time) {
    if(running) {
        accumulator+=Math.min((time-lastTime)/1000,.1)*value('speed');
        const steps=Math.min(6,Math.floor(accumulator));
        for(let i=0;i<steps;i++)advance();accumulator-=steps;
        if(steps)draw();
    }
    lastTime=time;requestAnimationFrame(animate);
}
restart(true);requestAnimationFrame(animate);
