/**
 * Pure genetic algorithm for closed tours. A chromosome is a permutation of point indices, so crossover must preserve exactly one copy of every point.
 */
/**
 * Measure a closed tour, including the return edge from the last point to the first.
 *
 * @param route - Ordered point indices forming a closed tour; each point appears exactly once.
 * @param points - Point coordinates with x/y components, indexed by route chromosomes.
 * @returns Total Euclidean distance of the closed tour, including its final return edge.
 */
export function routeLength(route,points) {
    return route.reduce((sum,id,i)=>{const a=points[id],b=points[route[(i+1)%route.length]];return sum+Math.hypot(a.x-b.x,a.y-b.y);},0);
}
/**
 * Use Fisher–Yates to produce a random chromosome containing every point exactly once.
 *
 * @param count - Number of point indices to include in the route permutation.
 * @param random - Random-number source returning a value in [0, 1); used for repeatable tests or randomized generation.
 * @returns A new permutation containing every point index exactly once.
 */
function shuffled(count,random) {
    const route=Array.from({length:count},(_,i)=>i);
    for(let i=count-1;i>0;i--){const j=Math.floor(random()*(i+1));[route[i],route[j]]=[route[j],route[i]];}
    return route;
}
/**
 * Keep one parent's slice and fill remaining slots in the other parent's order without duplicates.
 *
 * @param a - First parent route, a permutation of point indices.
 * @param b - Second parent route whose order fills the remaining child positions.
 * @param random - Random-number source returning a value in [0, 1); used for repeatable tests or randomized generation. Default: Math.random.
 * @returns A new valid child permutation with no missing or repeated points.
 */
export function crossover(a,b,random=Math.random) {
    const start=Math.floor(random()*a.length),end=start+1+Math.floor(random()*(a.length-start));
    const child=new Array(a.length).fill(-1),used=new Set(a.slice(start,end));
    for(let i=start;i<end;i++)child[i]=a[i];
    let index=end%a.length;
    for(let i=0;i<b.length;i++) {
        const value=b[(end+i)%b.length];if(used.has(value))continue;
        child[index]=value;index=(index+1)%a.length;
    }
    return child;
}
/**
 * Create a random population and evaluate the initial best and average distances.
 *
 * @param points - Point coordinates with x/y components, indexed by route chromosomes.
 * @param population - Number of candidate solutions maintained in the population. Default: 100.
 * @param random - Random-number source returning a value in [0, 1); used for repeatable tests or randomized generation. Default: Math.random.
 * @returns Initialized optimizer state with the first evaluated population and best route.
 */
export function createEvolution(points,population=100,random=Math.random) {
    const state={points,population,random,generation:0,members:[]};
    state.members=Array.from({length:population},()=>shuffled(points.length,random));
    evaluate(state);return state;
}
/**
 * Rank shorter tours first and update the population's summary statistics.
 *
 * @param state - Optimizer state containing point coordinates, route chromosomes, ranking, and generation statistics.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function evaluate(state) {
    state.ranked=state.members.map(route=>({route,length:routeLength(route,state.points)})).sort((a,b)=>a.length-b.length);
    state.best=state.ranked[0];state.average=state.ranked.reduce((s,m)=>s+m.length,0)/state.population;
}
/**
 * Breed a new population using tournament selection, ordered crossover, inversion mutation, and an unchanged elite.
 *
 * @param state - Optimizer state containing point coordinates, route chromosomes, ranking, and generation statistics.
 * @param mutation - Probability from zero to one of applying mutation during breeding. Default: .15.
 * @returns The same optimizer state after one evaluated generation.
 */
export function evolve(state,mutation=.15) {
    const random=state.random;
    /**
     * Use a tournament to select a fitter parent candidate from the current population.
     *
     * Inputs: None; uses enclosing state where needed.
     * @returns Route permutation of the selected parent.
     */
    const select=()=>{
        let best=state.ranked[Math.floor(random()*state.population)];
        for(let i=0;i<3;i++){const candidate=state.ranked[Math.floor(random()*state.population)];if(candidate.length<best.length)best=candidate;}
        return best.route;
    };
    // Elitism preserves the shortest route found so far.
    const next=[state.best.route.slice()];
    while(next.length<state.population) {
        const child=crossover(select(),select(),random);
        if(random()<mutation) {
            const a=Math.floor(random()*child.length),b=Math.floor(random()*child.length);
            const start=Math.min(a,b),end=Math.max(a,b);
            child.splice(start,end-start+1,...child.slice(start,end+1).reverse());
        }
        next.push(child);
    }
    state.members=next;state.generation++;evaluate(state);return state;
}
