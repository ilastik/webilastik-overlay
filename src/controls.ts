import { vec3 } from "gl-matrix";
import { forward_c, left_c, up_c, Camera } from "./camera";

export interface CameraMovement{

}

export class CameraControls{
    velocity = vec3.fromValues(0,0,0);

    private forward_velocity = vec3.fromValues(0, 0, 0)
    private left_velocity = vec3.fromValues(0, 0, 0)
    private up_velocity = vec3.fromValues(0, 0, 0)

    private forward = 0;
    private backward = 0;
    private left = 0;
    private right = 0;
    private up = 0;
    private down = 0;

    private rotating_left = 0
    private rotating_right = 0
    private rotating_up = 0
    private rotating_down = 0

    public constructor(){
        document.addEventListener("keydown", (ev) => {
            switch(ev.code){
                case "KeyW":
                    this.forward = 1
                    break
                case "KeyS":
                    this.backward = 1
                    break
                case "KeyA":
                    this.left = 1
                    break
                case "KeyD":
                    this.right = 1
                    break


                case "KeyQ":
                    this.up = 1
                    break
                case "KeyE":
                    this.down = 1
                    break


                case "ArrowUp":
                    this.rotating_up = 1
                    break
                case "ArrowDown":
                    this.rotating_down = 1
                    break
                case "ArrowLeft":
                    this.rotating_left = 1
                    break
                case "ArrowRight":
                    this.rotating_right = 1
                    break
            }
        })

        document.addEventListener("keyup", (ev) => {
            switch(ev.code){
                case "KeyW":
                    this.forward = 0
                    break
                case "KeyS":
                    this.backward = 0
                    break
                case "KeyA":
                    this.left = 0
                    break
                case "KeyD":
                    this.right = 0
                    break


                case "KeyQ":
                    this.up = 0
                    break
                case "KeyE":
                    this.down = 0
                    break


                case "ArrowUp":
                    this.rotating_up = 0
                    break
                case "ArrowDown":
                    this.rotating_down = 0
                    break
                case "ArrowLeft":
                    this.rotating_left = 0
                    break
                case "ArrowRight":
                    this.rotating_right = 0
                    break
            }
        })
    }

    public updateCamera(camera: Camera){
        vec3.scale(this.forward_velocity, forward_c, this.forward - this.backward)
        vec3.scale(   this.left_velocity,    left_c,       this.left - this.right)
        vec3.scale(     this.up_velocity,      up_c,          this.up - this.down)

        vec3.add(this.velocity, this.forward_velocity, this.left_velocity)
        vec3.add(this.velocity, this.velocity, this.up_velocity)
        vec3.normalize(this.velocity, this.velocity)
        vec3.scale(this.velocity, this.velocity, 0.01)

        camera.moveInViewSpace(this.velocity)
        camera.tiltUp((this.rotating_up - this.rotating_down) * 0.001)
        camera.rotateLeft((this.rotating_left - this.rotating_right) * 0.001)
    }
}
