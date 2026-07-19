import { useEffect, useRef } from 'react';

const vertexShaderSource = `// source for vertex shader
    attribute vec2 a_position;
    void main(){
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision highp float;
    void main(){
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);//solid red, for now
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

    const positions = new Float32Array([
        -1,1,
        3,-1,
        -1,3,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  return program;
}

export function SmokeBackground(){
    const canvasRef = useRef(null);

    useEffect(()=>{
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl');// this is what connects your gl to canvas
        if(!gl){
            console.log('WebGl not supported');
            return;
        }

        const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
        const program = createProgram(gl,vertexShader, fragmentShader);

        function resize(){
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0,0, canvas.width, canvas.height);
        }

        resize();
        window.addEventListener('resize',resize)// whenever the browser window is called run this funciton

        return () => window.removeEventListener('resize', resize)// when component dismounts get rid of listener
    },[]);

    return(
        <canvas 
            ref={canvasRef}
            style={{
                position:'fixed',
                top:'0',
                left:0,
                width: '100vw',
                height: '100vh',
                zIndex: -1
            }}
        >
            
        </canvas>
    )
    
}