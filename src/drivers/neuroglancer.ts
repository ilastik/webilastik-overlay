import { vec3, mat4, quat } from "gl-matrix"
import { IViewportDriver, IViewerDriver } from "..";
import { getElementContentRect } from "../util/misc";
import { NewViewportsHander } from "./viewer_driver";

type NeuroglancerLayout = "4panel" | "xy" | "xy-3d" | "xz" | "xz-3d" | "yz" | "yz-3d";

export class NeuroglancerViewportDriver implements IViewportDriver{
    private viewer: any
    constructor(
        public readonly viewer_driver: NeuroglancerDriver,
        public readonly panel: HTMLElement,
        private readonly orientation_offset: quat,
    ){
        this.viewer = viewer_driver.viewer
    }
    public getCameraPoseInVoxelSpace = () => {
        const orientation_vx = quat.multiply(
            quat.create(), this.viewer.navigationState.pose.orientation.orientation, this.orientation_offset
        )
        return {
            position_vx: this.viewer.navigationState.pose.position.value as vec3,
            orientation_vx: quat.normalize(orientation_vx, orientation_vx),
        }
    }
    public getVoxelToWorldMatrix = () => mat4.fromScaling(mat4.create(), vec3.fromValues(1, -1, -1))
    public getZoomInPixelsPerVoxel = () => 1 / this.viewer.navigationState.zoomFactor.value
    public getGeometry = () => {
        const panelContentRect = getElementContentRect(this.panel)
        const trackedElementRect = getElementContentRect(this.viewer_driver.getTrackedElement())
        return {
            left: panelContentRect.left - trackedElementRect.left,
            bottom: panelContentRect.bottom - trackedElementRect.bottom,
            width: panelContentRect.width,
            height: panelContentRect.height,
        }
    }
    public getDataUrl(): URL{
        //FIXME: what if there are multiple layers of type image?
        return this.viewer.state.toJSON().layers.filter((l: any) => l.type == "image")[0].source
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
            ["xz", quat.setAxisAngle(quat.create(), vec3.fromValues(1, 0, 0), Math.PI / 2)], // FIXME
            ["yz", quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), Math.PI / 2)],//FIXME
        ])
        if(layout == "4panel"){
            console.log("Detected 4panel layout!s!")
            return [
                new NeuroglancerViewportDriver(this, panels[0], orientation_offsets.get("xy")!),
                new NeuroglancerViewportDriver(this, panels[1], orientation_offsets.get("xz")!),
                new NeuroglancerViewportDriver(this, panels[3], orientation_offsets.get("yz")!),
            ]
        }
        return [new NeuroglancerViewportDriver(this, panels[0], orientation_offsets.get(layout.replace("-3d", ""))!)]
    }
    onViewportsChanged(handler: NewViewportsHander){
        this.viewer.layout.changed.add(() => {
            handler(this.getViewportDrivers())
        })
    }
}
