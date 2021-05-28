import { vec3, quat, mat4 } from "gl-matrix";
import { IViewerDriver } from "..";
import { createElement } from "../util/misc";
import { IViewportDriver, IViewportGeometry } from "./viewer_driver";

export class HtmlImgDriver implements IViewerDriver{
    public readonly img: HTMLImageElement;
    container: HTMLElement;
    constructor({img}:{img: HTMLImageElement}){
        this.img = img
        this.container = img.parentElement || document.body
    }
    public async getViewportDrivers() : Promise<Array<HtmlImgViewportDriver>>{
        return [new HtmlImgViewportDriver(this.img)]
    }
    public getTrackedElement(): HTMLImageElement{
        return this.img
    }
    public refreshViews(views: Array<{name: string, url: string}>, _channel_colors: Array<vec3>){
        const output_css_class = "ilastik_img_output_image"
        document.querySelectorAll("." + output_css_class).forEach(element => {
            const htmlElement = (element as HTMLElement)
            htmlElement.parentElement?.removeChild(htmlElement)
        })
        views.forEach(view => {
            const img = createElement({
                tagName: "img", parentElement: this.container, cssClasses: [output_css_class]
            }) as HTMLImageElement;
            img.src = view.url.toString()
        })
    }
}

export class HtmlImgViewportDriver implements IViewportDriver{
    public readonly data_url: string;
    private voxelToWorld = mat4.fromScaling(mat4.create(), vec3.fromValues(1, -1, -1))

    constructor(public readonly img: HTMLImageElement){
        try{
            this.data_url = new URL(this.img.src).toString()
        }catch{
            let url = new URL(window.location.href)
            if(this.img.src.startsWith("/")){
                url.pathname = this.img.src
            }else{
                url.pathname = url.pathname.replace(/\/$/, "") + "/" + this.img.src
            }
            this.data_url = url.toString()
        }
    }
    public getGeometry(): IViewportGeometry{
        return {left: 0, bottom: 0, height: this.img.height, width: this.img.width}
    }
    public getCameraPoseInVoxelSpace(): {position_vx: vec3, orientation_vx: quat}{
        return {
            position_vx: vec3.fromValues(this.img.width / 2, this.img.height / 2, 0),
            orientation_vx: quat.create(),
        }
    }
    public getVoxelToWorldMatrix(): mat4{
        return this.voxelToWorld
    }
    public getZoomInPixelsPerVoxel(): number{
        return 1
    }
}
