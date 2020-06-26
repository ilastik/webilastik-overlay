export type BinaryArray = ArrayBufferView & {length: number}

export type AttributeElementType = "BYTE" | "SHORT" | "UNSIGNED_BYTE" | "UNSIGNED_SHORT" | "FLOAT"

export type StencilOp = "KEEP" | "ZERO" | "REPLACE" | "INCR" | "INCR_WRAP" | "DECR" | "DECR_WRAP" | "INVERT"

export type StencilFunc = "NEVER" | "LESS" | "EQUAL" | "LEQUAL" | "GREATER" | "NOTEQUAL" | "GEQUAL" | "ALWAYS"

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