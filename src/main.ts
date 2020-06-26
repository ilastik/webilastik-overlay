import { Cube } from './shapes'
//import { Plane } from './shapes'

import { forward_c, left_c, SlicingCamera, PerspectiveCamera, up_c } from './camera'
//import { OrthoCamera } from './camera'

import { vec3, vec4 } from 'gl-matrix'
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


// debugger
// let slicing_plane = new Plane({
//     gl,
//     //position: vec3.fromValues(0, 0, -1),
//     scale: vec3.fromValues(1, 1, 1)
// });

// let stencil_plane = new Plane({
//     gl,
//     position: vec3.fromValues(0.5, 0, 0),
//     scale: vec3.fromValues(0.5, 1, 1)
// });

let cube = new Cube({gl,  scale: vec3.fromValues(0.5, 0.5, 0.5)});
// let camera = new OrthoCamera({
//     left: -10, right: 10,
//     near: 0, far: 100,
//     bottom: -10, top: 10
// })
let camera = new PerspectiveCamera({})
let slicing_camera = new SlicingCamera(gl, camera, vec3.fromValues(0,0,-3))


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

    slicing_camera.sliced_render(cube, vec4.fromValues(0,0,1, 1));
    // cube.render(camera, {
    //     cullConfig: false,//{face: CullFace.FRONT, frontFace: FrontFace.CCW}
    //     //depthFunc: DepthFunc.GREATER
    // })

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


let velocity = vec3.fromValues(0,0,0);
let forward_velocity = vec3.fromValues(0, 0, 0)
let left_velocity = vec3.fromValues(0, 0, 0)
let up_velocity = vec3.fromValues(0, 0, 0)

let forward = 0;
let backward = 0;
let left = 0;
let right = 0;
let up = 0;
let down = 0;

let rotating_left = 0
let rotating_right = 0
let rotating_up = 0
let rotating_down = 0

document.addEventListener("keydown", (ev) => {
    switch(ev.code){
        case "KeyW":
            forward = 1
            break
        case "KeyS":
            backward = 1
            break
        case "KeyA":
            left = 1
            break
        case "KeyD":
            right = 1
            break


        case "KeyQ":
            up = 1
            break
        case "KeyE":
            down = 1
            break


        case "ArrowUp":
            rotating_up = 1
            break
        case "ArrowDown":
            rotating_down = 1
            break
        case "ArrowLeft":
            rotating_left = 1
            break
        case "ArrowRight":
            rotating_right = 1
            break
    }
})

document.addEventListener("keyup", (ev) => {
    switch(ev.code){
        case "KeyW":
            console.log("pressed W")
            forward = 0
            break
        case "KeyS":
            console.log("pressed S")
            backward = 0
            break
        case "KeyA":
            console.log("pressed A")
            left = 0
            break
        case "KeyD":
            console.log("pressed D")
            right = 0
            break


        case "KeyQ":
            up = 0
            break
        case "KeyE":
            down = 0
            break


        case "ArrowUp":
            rotating_up = 0
            break
        case "ArrowDown":
            rotating_down = 0
            break
        case "ArrowLeft":
            rotating_left = 0
            break
        case "ArrowRight":
            rotating_right = 0
            break
    }
})



function parseCameraPosition(): vec3{
    let coords = camera_position_input.value.split(/, */).map((val_str) => parseFloat(val_str))
    return vec3.fromValues(coords[0], coords[1], coords[2])
}

function renderLoop(){
    vec3.scale(forward_velocity, forward_c, forward - backward)
    vec3.scale(   left_velocity,    left_c,       left - right)
    vec3.scale(     up_velocity,      up_c,          up - down)

    vec3.add(velocity, forward_velocity, left_velocity)
    vec3.add(velocity, velocity, up_velocity)
    vec3.scale(velocity, velocity, 0.1)

    camera.move(velocity)

    camera.tiltUp((rotating_up - rotating_down) * 0.025)
    camera.rotateLeft((rotating_left - rotating_right) * 0.025)


    let angle_rads = parseFloat(rads_input.value)
    cube.rotateY(angle_rads)

    render()

    window.requestAnimationFrame(renderLoop)
}

camera.lookAt({target_w: cube.position, position_w: parseCameraPosition(), up_w: vec3.fromValues(0, 1, 0), })
window.requestAnimationFrame(renderLoop)
