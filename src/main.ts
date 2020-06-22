import { Cube } from './shapes'
//import { Plane } from './shapes'

import { PerspectiveCamera } from './camera'
//import { OrthoCamera } from './camera'

import { vec3 } from 'gl-matrix'
import { StandardShaderProgram, /*DepthFunc, CullFace, FrontFace*/ } from './standard_shader'
import { createInput, createElement } from './utils'

let c = document.querySelector("#c")! as HTMLCanvasElement
console.log(`This is the canvas: ${c}`)

let gl = c.getContext("webgl2", {depth: true, stencil: true})!
//gl.enable(gl.CULL_FACE);
//gl.cullFace(gl.BACK);

gl.enable(gl.DEPTH_TEST)
gl.enable(gl.STENCIL_TEST)
//gl.depthFunc(gl.LESS)

c.width = 800
c.style.width = c.width + "px"

c.height = 800
c.style.height = c.height + "px"

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


let renderer = new StandardShaderProgram(gl)
// debugger
// let slicing_plane = new Plane({
//     gl,
//     renderer,
//     color: vec3.fromValues(1, 0, 0),
//     //position: vec3.fromValues(0, 0, -1),
//     scale: vec3.fromValues(1, 1, 1)
// });

// let stencil_plane = new Plane({
//     gl,
//     renderer, color: vec3.fromValues(0, 1, 0),
//     position: vec3.fromValues(0.5, 0, 0),
//     scale: vec3.fromValues(0.5, 1, 1)
// });

let cube = new Cube({gl, renderer, color: vec3.fromValues(0, 0, 1), scale: vec3.fromValues(0.5, 0.5, 0.5)});
let camera = new PerspectiveCamera({})
// let camera = new OrthoCamera({
//     left: -10, right: 10,
//     near: 0, far: 100,
//     bottom: -10, top: 10
// })


function render(){
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);


    // slicing_plane.render(camera, {
    //     //colorMask: {r: false, g: false, b: false, a: false}, //disable drawing of colors. only interested in depth
    // })


    // stencil_plane.render(camera, {
    //     depthMask: false, //do not update depth buffer when doing stencil stuff
    //     stencil: {
    //         func: "ALWAYS", ref: 1, mask: 0xFFFFFFFF, //always pass test to update the stencil buffer with stencil_plane geometry
    //         fail: "ZERO", zfail: "ZERO", zpass: "INCR"//since the buffer has been reset, this should increment the buffer to 1
    //     },
    // })

    cube.render(camera, {
        cullConfig: false,//{face: CullFace.FRONT, frontFace: FrontFace.CCW}
        //depthFunc: DepthFunc.GREATER
    })

//    cube.render(camera, {
//     stencil: {
//         func: "EQUAL", ref: 1, mask: 0xFFFFFFFF,//if stencil is 1, pass
//         fail: "KEEP", zfail: "KEEP", zpass: "KEEP", // do not touch stencil
//     }
//    })
}

let cube_controls = createElement({tagName: "div", parentElement: document.body})
createElement({tagName: "label", parentElement: cube_controls, innerHTML: "Cube Y rotation (rads): "})
let rads_input = createInput({inputType: "text", parentElement: cube_controls, value: "0.02"})

let camera_controls = createElement({tagName: "div", parentElement: document.body})
createElement({tagName: "label", parentElement: camera_controls, innerHTML: "Camera position (x,y,z): "})
let camera_position_input = createInput({inputType: "text", parentElement: camera_controls, value: "0, 0, 2.5"})
camera_position_input.addEventListener("keyup", () => {
    try{
        camera.moveTo(parseCameraPosition())
        render()
    }catch(e){
        //ignore editing mid way that won't parse
    }
})

let center_view_controls = createElement({tagName: "div", parentElement: document.body})
createInput({inputType: "button", value: "Center cam on cube", parentElement: center_view_controls, click: () => {
    camera.lookAt({target_w: cube.position, position_w: parseCameraPosition(), up_w: vec3.fromValues(0, 1, 0), })
}})


let camera_tilt_controls = createElement({tagName: "table", parentElement: camera_controls})
camera_tilt_controls.style.border = "solid 1px black"
    let controls_row = createElement({tagName: "tr", parentElement: camera_tilt_controls})
        createElement({tagName: "td", parentElement: controls_row});
        createElement({tagName: "td", parentElement: controls_row, innerHTML: "^", click: () => {
            console.log("Tilt camera up")
            camera.tiltUp(0.1)
        }});
        createElement({tagName: "td", parentElement: controls_row});

    controls_row = createElement({tagName: "tr", parentElement: camera_tilt_controls})
        createElement({tagName: "td", parentElement: controls_row, innerHTML: "<", click: () =>{
            console.log("Rotate camera left...")
            camera.rotateLeft(0.1)
        }});
        createElement({tagName: "td", parentElement: controls_row});
        createElement({tagName: "td", parentElement: controls_row, innerHTML: ">", click: () => {
            console.log("Rotate camera right...")
            camera.rotateLeft(-0.1)
        }});

    controls_row = createElement({tagName: "tr", parentElement: camera_tilt_controls})
        createElement({tagName: "td", parentElement: controls_row});
        createElement({tagName: "td", parentElement: controls_row, innerHTML: "V", click: () => {
            console.log("Tilt camera down")
            camera.tiltUp(-0.1)
        }});
        createElement({tagName: "td", parentElement: controls_row});


function parseCameraPosition(): vec3{
    let coords = camera_position_input.value.split(/, */).map((val_str) => parseFloat(val_str))
    return vec3.fromValues(coords[0], coords[1], coords[2])
}

function renderLoop(){
    let angle_rads = parseFloat(rads_input.value)
    cube.rotateY(angle_rads)

    render()

    window.requestAnimationFrame(renderLoop)
}

camera.lookAt({target_w: cube.position, position_w: parseCameraPosition(), up_w: vec3.fromValues(0, 1, 0), })
window.requestAnimationFrame(renderLoop)
