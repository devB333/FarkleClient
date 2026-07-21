precision highp float;
uniform vec2 resolution;
uniform float time;


float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

     float noise(vec2 st){
            vec2 i = floor(st); // what grid cell were in (int part)
            vec2 f = fract(st); // where inside that cell (0 to 1 fractional part). Only keeps the decimal so it gives me the exact decimal or percent of the cell im in

            // random value at each of the 4 corners of the cell

             float a = random(i);
             float b = random(i+ vec2(1.0, 0.0));// one cell to the right
             float c = random(i + vec2(0.0, 1.0)); // one cell up
             float d = random (i + vec2(1.0, 1.0)); // diagonal corenr

             // smooth the interpolation curve (instead of linear bending, which would show visible diamond-shaped seams)
             vec2 u = f * f * (3.0 - 2.0 * f);

             // blend the 4 corenrs together based on psoition within the cell
             float bottom = mix(a, b, u.x);  // blend bottom-left and bottom-right, based on x position
            float top    = mix(c, d, u.x);  // blend top-left and top-right, based on x position
            return mix(bottom, top, u.y);   // blend those two results, based on y position
        }
float fbm(vec2 st){// runs several differnt layers of the value noise function each contributing less and les, in order to make a more detlaied smoke pattern
        float value = 0.0;
        float amp = 0.5;

        for (int i = 0; i < 8; i++)
        {
            value += amp * noise(st);
            st *= 2.0;
            amp *= 0.5;
        }

        return value;
    }

float fbmSmoothShape(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 10; i++) { // 3 instead of 5 — much smoother, blobbier result
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

float jitter(float time)// jitter for flicker crt effect
{
    float jitterTime = (time*156879.05) + 19.60543;
    jitterTime += sin(jitterTime) * 2.0;
    return jitterTime;
}

vec2 applyScreenTear(vec2 uv, float t) {// randomize where the tear starts
    float cycleLength = 2.0; // total seconds per tear cycle (appear + wait)
    float cyclePos = fract(t / cycleLength); // 0.0 to 1.0, repeating

    float activeWindow = 0.05; // fraction of the cycle where the tear is visible/moving
    float tearActive = 1.0 - smoothstep(0.0, activeWindow, cyclePos);

    if (tearActive <= 0.0) {
        return uv; // no tear right now
    }

    // sweep tearY DOWN the screen during the active window only
    // (cyclePos / activeWindow) goes 0→1 over just the active portion, giving a fast sweep
    float sweepProgress = cyclePos / activeWindow;
    float tearY = sweepProgress + 0.5; // 0.0 (top) to 1.0 (bottom) during the active burst

    float cycleSeed = floor(t / cycleLength)/ 4.0;

    float distToTear = abs(uv.y - tearY);
    float tearBand = 1.0 - smoothstep(0.0, 0.02, distToTear);

    float tearOffset = (random(vec2(cycleSeed, 1.0)) - 0.5) * 0.3;

    uv.x += tearOffset * tearBand * tearActive;

    return uv;
}
    
    void main(){
        vec2 st = gl_FragCoord.xy / resolution.xy; // 0.0 to 1 across the screen
        st *= 1.3; // gridDensity (how many cells there are): scale down for larger blobs, scale up, so we see multiple grid cells instaed of 1 giant blur. Makes 8x8 cells in the grid
        

        st = applyScreenTear(st, time);

        // base pattern drifts slowly one direction
        vec2  basePos = st + time * 0.02;

        // warp samples move  differnt speeds/directions from the base, we alter the time an dir

        // sample fbm twice at offset positions to build a displacment vector
        vec2 warp = vec2(
            fbm(st + vec2(time * 0.15, -time *0.1)),
            fbm(st + vec2(-time * 0.1, time * 0.2) + vec2(10.8, 1.3))
        );

        // sample the base pattern, distoreed by the indepently-moving warp
        float n = fbmSmoothShape(basePos + warp *10.0);// warp is a 2d vector of two single floats constnaly being changed and scaled by time in differnt ways, then run 5 times through noise to get a single value for every pixle on the grid, 
        //then this is applied to to our basePos to constnatly warp it, and it will converge or push apart every time. Warp is a vector of noise values compounded, so lowering it will increase smoothness

        float blob = smoothstep(0.1, 0.7, n);// smoothstep will return 0, if n is below 0.1, and will reutrn 1 if above 0.7

        vec3 backgroundColor = vec3(0.04, 0.41, 0.39);
        vec3 waxColor = vec3(0.07, 0.29, 0.29);

        vec3 color = mix(backgroundColor, waxColor, blob);//blends two colors together based on the value of blob, to make it more extreme, make the blob smoothstep narrower

        //add scanLines
        // darken every other row slighlty
        float scanLine = sin(st.y * resolution.y * 4.0) * 0.02;
        color -= scanLine;

        //add vingette, darken edges and brightest in center
        vec2 vingetteUv = st - 0.5; // recenter to 0 0, screen center
        float vingette = 1.5 - dot(vingetteUv, vingetteUv) * 0.1;// use the dot product to get hypo from center, its cheaper
        vingette = clamp(vingette, 0.0, 1.0);
        color *= vingette;

        // add a little flicker, brightness pulses
        float flicker = 0.94 + 0.02 * sin( jitter(time/4.0));
        color *= flicker;


        gl_FragColor = vec4(color, 0.75); // 1 is just the alpha since color is a vec3 and already rgb, so this converts it to rgba
       


        
    }


