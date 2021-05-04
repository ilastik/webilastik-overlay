import { vec3, mat4, quat } from "gl-matrix"
import { getElementContentRect } from "./utils";
import { IViewerDriver, IViewportDriver } from "./viewer_driver"

type NeuroglancerLayout = "4panel" | "xy" | "xy-3d" | "xz" | "xz-3d" | "yz" | "yz-3d";

export class NeuroglancerViewportDriver implements IViewportDriver{
    private alreadyLogged: boolean = false
    private viewer: any
    constructor(
        public readonly viewer_driver: NeuroglancerDriver,
        public readonly panel: HTMLElement,
        private readonly orientation_offset: quat,
        private readonly name: string,
    ){
        this.viewer = viewer_driver.viewer
    }
    public getCameraPoseInVoxelSpace = () => {
        const ori = quat.normalize(quat.create(), quat.multiply(
            quat.create(), this.viewer.navigationState.pose.orientation.orientation, this.orientation_offset
        ))
        const out = {
            position_vx: this.viewer.navigationState.pose.position.value as vec3,
            orientation_vx: ori,
        }
        console.log(`**** Orientation for ${this.name}: ${quat.str(ori)}`)
        return out
    }
    public getVoxelToWorldMatrix = () => mat4.fromScaling(mat4.create(), vec3.fromValues(1, -1, -1))
    public getZoomInPixelsPerVoxel = () => 1 / this.viewer.navigationState.zoomFactor.value
    public getGeometry = () => {
        const panelContentRect = getElementContentRect(this.panel)
        const trackedElementRect = getElementContentRect(this.viewer_driver.getTrackedElement())
        let out = {
            left: panelContentRect.left - trackedElementRect.left,
            bottom: panelContentRect.bottom - trackedElementRect.bottom,
            width: panelContentRect.width,
            height: panelContentRect.height,
        }
        if(!this.alreadyLogged){
            console.log("panelContentRect:"); console.log(panelContentRect)
            console.log("parentContentRect:"); console.log(trackedElementRect)
            console.log("out geometry:"); console.log(out)
            this.alreadyLogged = true
        }
        return out
    }
    public getInjectionParams = () => ({
        precedingElement: this.panel,
        // zIndex: 10
    })
}

export class NeuroglancerDriver implements IViewerDriver{
    constructor(public readonly viewer: any){}
    getTrackedElement() : HTMLElement{
        return document.querySelector("canvas")! //FIXME: double-check selector
    }
    getViewportDrivers(): Array<IViewportDriver>{
        const panels = Array(...document.querySelectorAll(".neuroglancer-panel")) as Array<HTMLElement>;
        const layout: NeuroglancerLayout = this.viewer.state.toJSON()["layout"]
        const orientation_offsets = new Map<string, quat>([
            ["xy", quat.create()],
            ["xz", quat.fromEuler(quat.create(), /*-Math.PI / 2*/ 1, 0, 0)], // FIXME
            ["yz", quat.fromEuler(quat.create(), 0, -Math.PI / 2, 0)],//FIXME
        ])
        if(layout == "4panel"){
            console.log("Detected 4panel layout!s!")
            return [
                new NeuroglancerViewportDriver(this, panels[0], orientation_offsets.get("xy")!, "xy"),
                new NeuroglancerViewportDriver(this, panels[1], orientation_offsets.get("xz")!, "xz"),
                // new NeuroglancerViewportDriver(this, panels[3], orientation_offsets.get("yz")!),
            ]
        }
        return [new NeuroglancerViewportDriver(this, panels[0], orientation_offsets.get(layout.replace("-3d", ""))!, layout.replace("-3d", ""))]
    }
}
