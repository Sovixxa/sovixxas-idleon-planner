// Native equivalents of the three date-fns operations used by the alert formulas.
export const isPast=value=>new Date(value).getTime()<Date.now();
export const differenceInMinutes=(a,b)=>Math.trunc((new Date(a).getTime()-new Date(b).getTime())/60000);
export const differenceInHours=(a,b)=>Math.trunc((new Date(a).getTime()-new Date(b).getTime())/3600000);
