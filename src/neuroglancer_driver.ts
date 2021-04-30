import { vec3, mat4, quat } from "gl-matrix"
import { getElementContentRect } from "./utils";
import { IViewerDriver, IViewportDriver } from "./viewer_driver"

type NeuroglancerLayout = "4panel" | "xy" | "xy-3d" | "xz" | "xz-3d" | "yz" | "yz-3d";

export class NeuroglancerViewportDriver implements IViewportDriver{
    constructor(
        public readonly viewer: any,
        public readonly panel: HTMLElement,
        private readonly orientation_offset: quat,
    ){
    }
    getCameraPositionInVoxelSpace(): vec3{
        return this.viewer.navigationState.pose.position.value as vec3
    }
    getVoxelToWorldMatrix(): mat4{
        //FIXME: this changes if the data is anisotropic
        return mat4.fromScaling(mat4.create(), vec3.fromValues(1, -1, -1))
    }
    getZoomInPixelsPerVoxel(): number{
        return 1 / this.viewer.navigationState.zoomFactor.value
    }
    getCameraOrientationInVoxelSpace(): quat{
        return quat.multiply(
            quat.create(), this.viewer.navigationState.pose.orientation.orientation, this.orientation_offset
        )
    }
    getViewportGeometryInPixels(): {left: number, top: number, width: number, height: number}{
        const panelParent = this.panel.parentNode! as HTMLElement
        const panelContentRect = getElementContentRect(this.panel)
        const parentContentRect = getElementContentRect(panelParent)

        return {
            left: panelContentRect.left - parentContentRect.left,
            top: panelContentRect.top - parentContentRect.top,
            width: panelContentRect.width,
            height: panelContentRect.height,
        }
    }
}

export class NeuroglancerDriver implements IViewerDriver{
    constructor(public readonly viewer: any){}
    getTrackedElement() : HTMLElement{
        return document.querySelector("#neuroglancer-container")! //FIXME: double-check selector
    }
    getViewportDrivers(): Array<IViewportDriver>{
        const panels = Array(...document.querySelectorAll(".neuroglancer-panel")) as Array<HTMLElement>;
        const layout: NeuroglancerLayout = this.viewer.state.toJSON()["layout"]
        const orientation_offsets = {
            xy: quat.create(),
            xz: quat.fromEuler(quat.create(), -Math.PI / 2, 0, 0), // FIXME
            yz: quat.fromEuler(quat.create(), 0, -Math.PI / 2, 0),//FIXME
        }
        if(layout == "4panel"){
            return [
                new NeuroglancerViewportDriver(this.viewer, panels[0], orientation_offsets.xy),
                new NeuroglancerViewportDriver(this.viewer, panels[1], orientation_offsets.xz),
                new NeuroglancerViewportDriver(this.viewer, panels[3], orientation_offsets.yz),
            ]
        }
        return [new NeuroglancerViewportDriver(this.viewer, panels[0], (<any>orientation_offsets)[layout.replace("-3d", "")])]
    }
}
