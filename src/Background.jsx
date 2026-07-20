import { useEffect, useRef } from 'react';
import fragmentShaderSource from './shaders/smoke.frag.glsl?raw';

const vertexShaderSource = `// source for vertex shader
    attribute vec2 a_position;
    void main(){
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;





function compileShader(gl, source, type)
{
    const shader = gl.createShader(type); //1. make an empty shader obj
    gl.shaderSource(shader, source) // 2. give it our GLSL source code
    gl.compileShader(shader); // 3. ask the gpu driver to compile it

    // 4. check if compilation actually succeeded
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader){
    const program = gl.createProgram();
    gl.attachShader(program, fragmentShader);
    gl.attachShader(program, vertexShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
  }
  return program;
}

export function SmokeBackground(){
    const canvasRef = useRef(null);
    const programRef = useRef(null);
    const resolutionLocation = useRef(null);
    const timeUniformLocation = useRef(null);
    const glRef = useRef(null);
    


    useEffect(()=>{
        
         glRef.current = canvasRef.current.getContext('webgl');// this is what connects your gl to canvas
        if(!glRef.current){
            console.log('WebGl not supported');
            return;
        }

        
        

        function resize(){
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            glRef.current.viewport(0,0, canvasRef.current.width, canvasRef.current.height);
        }

        resize();
        window.addEventListener('resize',resize)// whenever the browser window is called run this funciton


        const vertexShader = compileShader(glRef.current, vertexShaderSource, glRef.current.VERTEX_SHADER);
        const fragmentShader = compileShader(glRef.current, fragmentShaderSource, glRef.current.FRAGMENT_SHADER);
        const program = createProgram(glRef.current,vertexShader, fragmentShader);

                const positions = new Float32Array([
                -1,-1,
                3,-1,
                -1,3,
            ]);

            const positionBuffer = glRef.current.createBuffer();
            glRef.current.bindBuffer(glRef.current.ARRAY_BUFFER, positionBuffer);
            glRef.current.bufferData(glRef.current.ARRAY_BUFFER, positions, glRef.current.STATIC_DRAW);

            const positionLocation = glRef.current.getAttribLocation(program, 'a_position');
            glRef.current.enableVertexAttribArray(positionLocation);
            glRef.current.vertexAttribPointer(positionLocation, 2, glRef.current.FLOAT, false, 0, 0);

            glRef.current.useProgram(program);

             resolutionLocation.current = glRef.current.getUniformLocation(program, 'resolution');
             timeUniformLocation.current = glRef.current.getUniformLocation(program, 'time');
            

        return () => window.removeEventListener('resize', resize)// when component dismounts get rid of listener
    },[]);

    const timeRef = useRef(0);// we only need a timeRef to drive time because this is just for the glsl shader pipline, dont want React to constnatly reRender
    const frameRef = useRef(0);

    useEffect(()=>{
        let lastTime = performance.now();

        function animate(currTime){
            const deltaTime = (currTime - lastTime) / 1000;
            lastTime = currTime;

            timeRef.current += deltaTime * 0.1; // 2 speeds it up a little bit, matches Game.jsx speed as well

            glRef.current.uniform2f(resolutionLocation.current, canvasRef.current.width, canvasRef.current.height);
            glRef.current.uniform1f(timeUniformLocation.current, timeRef.current);
            glRef.current.drawArrays(glRef.current.TRIANGLES, 0, 3);

            frameRef.current = requestAnimationFrame(animate); // keeps track of the next curr animation frame id, so we know what to call to cancle it
        }
            frameRef.current = requestAnimationFrame(animate);// start the animation loop
        return ()=> cancelAnimationFrame(frameRef.current);// runs on component unmount so it stops the time counter and stops requeting animation frames
    }, []);

    return(
        <canvas 
            ref={canvasRef}
            style={{
                position:'fixed',
                top:'0',
                left:0,
                width: '100vw',
                height: '100vh',
                zIndex: 0
            }}
        >
            
        </canvas>
    )
    
}