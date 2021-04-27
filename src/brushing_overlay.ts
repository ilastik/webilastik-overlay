import { mat4, quat, vec3 } from 'gl-matrix'
import { BrushelBoxRenderer } from './brush_boxes_renderer'
import { BrushRenderer } from './brush_renderer'
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
    private renderer : BrushRenderer

    public constructor({
        trackedElement,
        camera_position,
        camera_orientation,
        voxelToWorld,
        pixelsPerVoxel,
        renderer
    }: {
        trackedElement: HTMLElement, //element over which the overlay will always be
        camera_position?: vec3, //camera position in world coordinates
        camera_orientation?: quat,
        voxelToWorld: mat4,
        pixelsPerVoxel: number, //orthogonal zoom; how many pixels (the smallest dimension of) the voxel should occupy on screen
        renderer?: BrushRenderer,
    }){
        const voxel_proportions = mat4.getScaling(vec3.create(), voxelToWorld).map((value: number) => Math.abs(value))
        if(Math.min(...voxel_proportions) != 1){
            throw `Bad voxelToWorld matrix; One dimension of a voxel should be 1 (or -1) so as not to change the meaning of pixelsPerVoxel`
        }
        this.voxelToWorld = mat4.clone(voxelToWorld);
        this.worldToVoxel = mat4.invert(mat4.create(), voxelToWorld);
        this.pixelsPerVoxel = this.setZoom(pixelsPerVoxel); //strict initialization
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
        this.renderer = renderer || new BrushelBoxRenderer({gl: this.gl, highlightCrossSection: false, onlyCrossSection: false})
    }

    public setRenderer(renderer: BrushRenderer){
        this.renderer = renderer
    }

    public setZoom(pixelsPerVoxel: number): number{
        if(pixelsPerVoxel <= 0){
            throw `pixelsPerVoxel must be positive. If you want to flip the direction of voxels, do so in voxelToWorld`
        }
        this.pixelsPerVoxel = pixelsPerVoxel
        return pixelsPerVoxel
    }

    public getMouseClipPosition(ev: MouseEvent): vec3{
        let position_c = vec3.fromValues(
            (ev.offsetX - (this.canvas.scrollWidth / 2)) / (this.canvas.scrollWidth / 2),
           -(ev.offsetY - (this.canvas.scrollHeight / 2)) / (this.canvas.scrollHeight / 2), //gl viewport +y points up, but mouse events have +y pointing down
            0, //Assume slicing plane is in the MIDDLE of clip space
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

        // - left, right, top, bottom, near and far are measured in world-space-units;
        //      - 1 world-space-unit is the smallest side of a voxel, as determined by this.voxelToWorld
        //           - For isotropic data, it's simply 1
        // - pixelsPerVoxel determines the zoom/field of view;
        // - near and far have to be such that a voxel in any orientation would fit between them;
        const voxel_diagonal_length = 10//vec3.length(mat4.getScaling(vec3.create(), this.voxelToWorld))
        const canvas_width_in_voxels = canvas.scrollWidth / this.pixelsPerVoxel
        const canvas_height_in_voxels = canvas.scrollHeight / this.pixelsPerVoxel
        this.camera.reconfigure({
            left: -canvas_width_in_voxels / 2,
            right: canvas_width_in_voxels / 2,
            near: -voxel_diagonal_length,
            far: voxel_diagonal_length,
            bottom: -canvas_height_in_voxels / 2,
            top: canvas_height_in_voxels / 2,
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
