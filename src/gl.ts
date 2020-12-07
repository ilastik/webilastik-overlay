import { vec4 } from "gl-matrix"

export type BinaryArray = ArrayBufferView & {length: number}

export enum AttributeElementType{
    BYTE = WebGL2RenderingContext.BYTE,
    SHORT = WebGL2RenderingContext.SHORT,
    UNSIGNED_BYTE = WebGL2RenderingContext.UNSIGNED_BYTE,
    UNSIGNED_SHORT = WebGL2RenderingContext.UNSIGNED_SHORT,
    FLOAT = WebGL2RenderingContext.FLOAT,
}

// determines if each atribute value in the buffer is a single, vec2, vec3 or vec4
export type AttributeNumComponents = 1 | 2 | 3 | 4

export enum StencilOp{
    KEEP = WebGL2RenderingContext["KEEP"],
    ZERO = WebGL2RenderingContext["ZERO"],
    REPLACE = WebGL2RenderingContext["REPLACE"],
    INCR = WebGL2RenderingContext["INCR"],
    INCR_WRAP = WebGL2RenderingContext["INCR_WRAP"],
    DECR = WebGL2RenderingContext["DECR"],
    DECR_WRAP = WebGL2RenderingContext["DECR_WRAP"],
    INVERT = WebGL2RenderingContext["INVERT"],
}

export enum StencilFunc{
    NEVER = WebGL2RenderingContext["NEVER"],
    LESS = WebGL2RenderingContext["LESS"],
    EQUAL = WebGL2RenderingContext["EQUAL"],
    LEQUAL = WebGL2RenderingContext["LEQUAL"],
    GREATER = WebGL2RenderingContext["GREATER"],
    NOTEQUAL = WebGL2RenderingContext["NOTEQUAL"],
    GEQUAL = WebGL2RenderingContext["GEQUAL"],
    ALWAYS = WebGL2RenderingContext["ALWAYS"],
}

export enum CullFace{
    BACK = WebGL2RenderingContext["BACK"],
    FRONT = WebGL2RenderingContext["FRONT"],
    FRONT_AND_BACK = WebGL2RenderingContext["FRONT_AND_BACK"],
}

export enum FrontFace{
    CW = WebGL2RenderingContext["CW"],
    CCW = WebGL2RenderingContext["CCW"],
}

export enum BlendFactor{
    ZERO = WebGL2RenderingContext["ZERO"],
    ONE = WebGL2RenderingContext["ONE"],
    SRC_COLOR = WebGL2RenderingContext["SRC_COLOR"],
    ONE_MINUS_SRC_COLOR = WebGL2RenderingContext["ONE_MINUS_SRC_COLOR"],
    DST_COLOR = WebGL2RenderingContext["DST_COLOR"],
    ONE_MINUS_DST_COLOR = WebGL2RenderingContext["ONE_MINUS_DST_COLOR"],
    SRC_ALPHA = WebGL2RenderingContext["SRC_ALPHA"],
    ONE_MINUS_SRC_ALPHA = WebGL2RenderingContext["ONE_MINUS_SRC_ALPHA"],
    DST_ALPHA = WebGL2RenderingContext["DST_ALPHA"],
    ONE_MINUS_DST_ALPHA = WebGL2RenderingContext["ONE_MINUS_DST_ALPHA"],
    CONSTANT_COLOR = WebGL2RenderingContext["CONSTANT_COLOR"],
    ONE_MINUS_CONSTANT_COLOR = WebGL2RenderingContext["ONE_MINUS_CONSTANT_COLOR"],
    CONSTANT_ALPHA = WebGL2RenderingContext["CONSTANT_ALPHA"],
    ONE_MINUS_CONSTANT_ALPHA = WebGL2RenderingContext["ONE_MINUS_CONSTANT_ALPHA"],
    SRC_ALPHA_SATURATE = WebGL2RenderingContext["SRC_ALPHA_SATURATE"],
}

export enum DepthFunc{
    NEVER = WebGL2RenderingContext["NEVER"],
    LESS = WebGL2RenderingContext["LESS"],
    EQUAL = WebGL2RenderingContext["EQUAL"],
    LEQUAL = WebGL2RenderingContext["LEQUAL"],
    GREATER = WebGL2RenderingContext["GREATER"],
    NOTEQUAL = WebGL2RenderingContext["NOTEQUAL"],
    GEQUAL = WebGL2RenderingContext["GEQUAL"],
    ALWAYS = WebGL2RenderingContext["ALWAYS"],
}

export interface CullConfig{
    face: CullFace,
    frontFace: FrontFace,
}

export interface ColorMask{
    r: boolean, g: boolean, b: boolean, a: boolean
}

export interface StencilConfig{
    func: StencilFunc, ref: number, mask: number,
    fail: StencilOp, zfail: StencilOp, zpass: StencilOp,
}

export interface BlendingConfig{
    sfactor: BlendFactor,
    dfactor: BlendFactor,
    color?: vec4,
}

export interface DepthConfig{
    mask: boolean,
    func: DepthFunc,
}

export interface RenderParams{
    colorMask?: ColorMask,
    depthConfig?: DepthConfig,
    stencilConfig?: StencilConfig,
    cullConfig?: CullConfig | false,
    blendingConfig?: BlendingConfig | false,
}