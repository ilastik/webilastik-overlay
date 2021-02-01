import { mat4 } from "gl-matrix";
import { BrushStroke } from ".";
import { Camera } from "./camera";
import { RenderParams } from "./gl";

export interface BrushRenderer{
    render: (params: {
        brush_strokes: Array<BrushStroke>,
        camera: Camera,
        voxelToWorld: mat4,
        renderParams?: RenderParams
    }) => void,
}
