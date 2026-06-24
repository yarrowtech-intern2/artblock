import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import type { ComponentProps } from "react";

type RuntimeShaderGradientProps = ComponentProps<typeof ShaderGradient> & {
  axesHelper?: "on" | "off";
  bgColor1?: string;
  bgColor2?: string;
  destination?: string;
  embedMode?: "off" | "on";
  fov?: number;
  format?: string;
  frameRate?: number;
  gizmoHelper?: "hide" | "show";
  pixelDensity?: number;
};

const followerShaderProps: RuntimeShaderGradientProps = {
  animate: "on",
  axesHelper: "on",
  bgColor1: "#000000",
  bgColor2: "#000000",
  brightness: 1.7,
  cAzimuthAngle: 180,
  cDistance: 4.09,
  cPolarAngle: 95,
  cameraZoom: 1,
  color1: "#0565ff",
  color2: "#000000",
  color3: "#0043fd",
  destination: "onCanvas",
  embedMode: "off",
  envPreset: "city",
  format: "gif",
  fov: 20,
  frameRate: 10,
  gizmoHelper: "hide",
  grain: "off",
  lightType: "3d",
  pixelDensity: 0.3,
  positionX: 0,
  positionY: -2.1,
  positionZ: 0,
  range: "disabled",
  rangeEnd: 40,
  rangeStart: 0,
  reflection: 0.1,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 225,
  shader: "defaults",
  type: "waterPlane",
  uAmplitude: 0,
  uDensity: 2.7,
  uFrequency: 5.5,
  uSpeed: 0.4,
  uStrength: 2,
  uTime: 0.2,
  wireframe: false
};

const artistShaderProps: RuntimeShaderGradientProps = {
  animate: "on",
  axesHelper: "off",
  bgColor1: "#000000",
  bgColor2: "#000000",
  brightness: 1,
  cAzimuthAngle: 180,
  cDistance: 2.8,
  cPolarAngle: 80,
  cameraZoom: 9.1,
  color1: "#606080",
  color2: "#8d7dca",
  color3: "#212121",
  destination: "onCanvas",
  embedMode: "off",
  envPreset: "city",
  format: "gif",
  fov: 45,
  frameRate: 10,
  gizmoHelper: "hide",
  grain: "on",
  lightType: "3d",
  pixelDensity: 1,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  range: "disabled",
  rangeEnd: 40,
  rangeStart: 0,
  reflection: 0.1,
  rotationX: 50,
  rotationY: 0,
  rotationZ: -60,
  shader: "defaults",
  type: "waterPlane",
  uAmplitude: 0,
  uDensity: 1.5,
  uFrequency: 0,
  uSpeed: 0.3,
  uStrength: 1.5,
  uTime: 8,
  wireframe: false
};

type StoryPanelShaderBackgroundProps = {
  variant: "blue" | "violet";
};

const StoryPanelShaderBackground = ({ variant }: StoryPanelShaderBackgroundProps) => (
  <div aria-hidden="true" className="new-home-story__shader-bg">
    <ShaderGradientCanvas
      className="new-home-story__shader-canvas"
      fov={variant === "blue" ? 20 : 45}
      lazyLoad
      pixelDensity={variant === "blue" ? 0.3 : 1}
      pointerEvents="none"
      style={{ width: "100%", height: "100%" }}
    >
      <ShaderGradient {...(variant === "blue" ? followerShaderProps : artistShaderProps)} />
    </ShaderGradientCanvas>
  </div>
);

export default StoryPanelShaderBackground;
