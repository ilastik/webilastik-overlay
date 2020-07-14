// import { Cube } from './shapes'
//import { Plane } from './shapes'

import { SlicingCamera } from './camera'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'


import { vec3, vec4 } from 'gl-matrix'
// import { createInput, createElement } from './utils'
import { CameraControls } from './controls'

let c = document.querySelector("#c")! as HTMLCanvasElement
console.log(`This is the canvas: ${c}`)

let gl = c.getContext("webgl2", {depth: true, stencil: true})!

gl.enable(gl.DEPTH_TEST)
gl.enable(gl.STENCIL_TEST)

c.width = 800
c.style.width = c.width + "px"

c.height = 800
c.style.height = c.height + "px"

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);



let brushStroke = new Array<vec3>()

for(let x=0; x<1; x++){
    for(let y=0; y<1; y++){
       brushStroke.push(vec3.fromValues(x, y, 0))
    }
}

let camera = new OrthoCamera({
    left:   -1, right:  1,
    near:     0,   far: 100,
    bottom: -1,   top:  1
})
// let camera = new PerspectiveCamera({far: 10 })
let slicing_camera = new SlicingCamera(gl, camera)
let controls = new CameraControls()


// let cube_controls = createElement({tagName: "div", parentElement: document.body})
// createElement({tagName: "label", parentElement: cube_controls, innerHTML: "Cube Y rotation (rads): "})
// let rads_input = createInput({inputType: "text", parentElement: cube_controls, value: "0.02"})

// let center_view_controls = createElement({tagName: "div", parentElement: document.body})
// createInput({inputType: "button", value: "Center cam on cube", parentElement: center_view_controls, click: () => {
//     camera.lookAt({target_w: cube.position, position_w: camera.position_w, up_w: vec3.fromValues(0, 1, 0), })
// }})


function renderLoop(){
    controls.updateCamera(camera);

    // let angle_rads = parseFloat(rads_input.value)
    // cube.rotateY(angle_rads)

    slicing_camera.renderBrushStroke(brushStroke, vec4.fromValues(0,0,1, 1), false);

    window.requestAnimationFrame(renderLoop)
}

camera.lookAt({target_w: vec3.fromValues(0,0,0), position_w: vec3.fromValues(0, 0, 2.5), up_w: vec3.fromValues(0, 1, 0), })
window.requestAnimationFrame(renderLoop)
