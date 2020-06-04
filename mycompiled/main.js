import { Cube } from './shapes';
import { PerspectiveCamera } from './camera';
import { vec3 } from 'gl-matrix';
let c = document.querySelector("#c");
console.log(`This is the canvas: ${c}`);
let gl = c.getContext("webgl2");
c.width = 800;
c.style.width = "800px";
c.height = 600;
c.style.height = "600px";
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);
let camera = new PerspectiveCamera({});
camera.moveTo(vec3.fromValues(10, 10, 0));
let cube = new Cube({ gl });
cube.render(camera);
//# sourceMappingURL=main.js.map