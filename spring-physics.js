(() => {
  const pointAt=(points,t)=>{
    if(points.length===1)return points[0].slice();
    const position=Math.max(0,Math.min(1,t))*(points.length-1);
    const i=Math.min(points.length-2,Math.floor(position)),u=position-i;
    return [points[i][0]+(points[i+1][0]-points[i][0])*u,points[i][1]+(points[i+1][1]-points[i][1])*u];
  };
  // Uniform time samples: the second derivative of y is positive and constant.
  // The ball leaves the mat upwards and returns to the receiver downwards.
  const flight=(from,to,height=80,count=80)=>Array.from({length:count+1},(_,i)=>{
    const t=i/count;
    return [from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t-4*height*t*(1-t)];
  });
  const compression=t=>15*t*t;
  const release=t=>15-23*(1-Math.pow(1-t,2));
  const settle=t=>t>=1?0:-8*Math.exp(-6*t)*Math.cos(13*t);
  window.PinballSpring=Object.freeze({pointAt,flight,compression,release,settle});
})();
