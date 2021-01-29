import { mat4, quat, vec3 } from 'gl-matrix'
import { BrushelBoxRenderer } from './brush_boxes_renderer'
// import { BrushShaderProgram } from './brush_stroke'
import { BrushStroke } from './brush_stroke'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'
import { CameraControls } from './controls'
import { ClearConfig, RenderParams } from './gl'
import { coverContents, insertAfter } from './utils'


export class BrushingOverlay{
    public readonly canvas: HTMLCanvasElement
    public readonly gl: WebGL2RenderingContext
    public readonly trackedElement: HTMLElement

    public readonly camera: OrthoCamera
    public readonly voxelToWorld: mat4
    public readonly worldToVoxel: mat4

    private camera_controls: CameraControls
    private pixelsPerVoxel: number
    // private renderer : BrushShaderProgram
    private renderer : BrushelBoxRenderer

    public constructor({
        trackedElement,
        camera_position,
        camera_orientation,
        voxelToWorld,
        pixelsPerVoxel,
    }: {
        trackedElement: HTMLElement, //element over which the overlay will always be
        camera_position?: vec3, //camera position in world coordinates
        camera_orientation?: quat,
        voxelToWorld: mat4,
        pixelsPerVoxel: number //orthogonal zoom; how many pixels (the smallest dimension of) the voxel should occupy on screen
    }){
        this.voxelToWorld = mat4.clone(voxelToWorld);
        this.worldToVoxel = mat4.invert(mat4.create(), voxelToWorld);
        this.setZoom(pixelsPerVoxel)
        this.trackedElement = trackedElement
        this.canvas = document.createElement("canvas"); //<HTMLCanvasElement>createElement({tagName: "canvas", parentElement: trackedElement.parentElement || document.body})
        insertAfter({reference: trackedElement, new_element: this.canvas})
        this.canvas.style.zIndex = trackedElement.style.zIndex

        this.gl = this.canvas.getContext("webgl2", {depth: true, stencil: true})!
        this.camera = new OrthoCamera({
            left: -1, right: 1, near: 0, far: 1, bottom: -1, top:  1, //all these params are meaningless; they are overwritten every frame
            position: camera_position, orientation: camera_orientation
        })
        this.camera_controls = new CameraControls()
        this.renderer = new BrushelBoxRenderer({gl: this.gl, debugColors: false})
    }

    public setZoom(pixelsPerVoxel: number){
        this.pixelsPerVoxel = pixelsPerVoxel
    }

    public getMouseClipPosition(ev: MouseEvent): vec3{
        let position_c = vec3.fromValues(
            (ev.offsetX - (this.canvas.scrollWidth / 2)) / (this.canvas.scrollWidth / 2),
           -(ev.offsetY - (this.canvas.scrollHeight / 2)) / (this.canvas.scrollHeight / 2), //viewport +y points up, but mouse events have +y pointing down
            0, //FIXME: make sure this is compatible with camera near/far configs
        )
        // console.log(`ev.offsetY: ${ev.offsetY}`)
        // console.log(`ClipPosition: ${vecToString(position_c)}`)
        return position_c
    }

    public getMouseWorldPosition(ev: MouseEvent): vec3{
        let position_c = this.getMouseClipPosition(ev)
        let position_w = vec3.transformMat4(vec3.create(), position_c, this.camera.clip_to_world)
        // console.log(`WorldPosition: ${vecToString(position_w)}`)
        return position_w
    }

    public getMouseVoxelPosition(ev: MouseEvent): vec3{
        let position_w = this.getMouseWorldPosition(ev)
        let position_vx = vec3.transformMat4(vec3.create(), position_w, this.worldToVoxel)
        // console.log(`VoxelPosition: ${vecToString(position_vx)} ======================`)
        return position_vx
    }

    public snapTo(camera_position: vec3, camera_orientation: quat){
        this.camera.moveTo(camera_position)
        this.camera.reorient(camera_orientation)
    }

    public render = (brushStrokes: Array<BrushStroke>) => {
        const canvas = <HTMLCanvasElement>this.gl.canvas
        coverContents({target: this.trackedElement, overlay: canvas})

        //left, right, top, bottom, near and far are measured in voxels; pixelsPerVoxel determines the field of view
        this.camera.reconfigure({
            left: -canvas.scrollWidth / this.pixelsPerVoxel / 2,
            right: canvas.scrollWidth / this.pixelsPerVoxel / 2,
            near: 0,
            far: 10, // This could be just 1... but oblique views might mess things up since a cube has length 1 * (3 ^ (1/2)) on opposite corners
            bottom: -canvas.scrollHeight / this.pixelsPerVoxel / 2,
            top: canvas.scrollHeight / this.pixelsPerVoxel / 2,
        })

        canvas.width = canvas.scrollWidth
        canvas.height = canvas.scrollHeight
        this.gl.viewport(0, 0, canvas.scrollWidth, canvas.scrollHeight); //FIXME: shuold aspect play a role here?
        this.camera_controls.updateCamera(this.camera);

        this.renderer.render({
            brush_strokes: brushStrokes,
            camera: this.camera,
            voxelToWorld: this.voxelToWorld,
            renderParams: new RenderParams({
                clearConfig: new ClearConfig({
                    a: 0.0,
                })
            })
        })
    }
}
