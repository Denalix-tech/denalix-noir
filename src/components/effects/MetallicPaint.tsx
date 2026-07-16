"use client";

import { useEffect, useRef, useState } from "react";
import "./MetallicPaint.css";

type MetallicPaintProps = {
  imageSrc: string;
  seed?: number;
  scale?: number;
  liquid?: number;
  speed?: number;
  brightness?: number;
  contrast?: number;
  refraction?: number;
  blur?: number;
  chromaticSpread?: number;
  fresnel?: number;
  lightColor?: string;
  darkColor?: string;
  tintColor?: string;
  className?: string;
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

const VERTEX_SRC = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SRC = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_mask;
uniform float u_time;
uniform float u_seed;
uniform float u_scale;
uniform float u_liquid;
uniform float u_speed;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_refraction;
uniform float u_blur;
uniform float u_chromaticSpread;
uniform float u_fresnel;
uniform vec3 u_lightColor;
uniform vec3 u_darkColor;
uniform vec3 u_tintColor;
uniform vec2 u_resolution;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + u_seed);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amp * noise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return value;
}

float maskAlpha(vec2 uv) {
  return texture(u_mask, uv).a;
}

void main() {
  vec2 uv = v_uv;
  float t = u_time * u_speed;

  float px = 1.0 / u_resolution.x;
  float py = 1.0 / u_resolution.y;
  float a = maskAlpha(uv);
  float aX = maskAlpha(uv + vec2(px, 0.0)) - maskAlpha(uv - vec2(px, 0.0));
  float aY = maskAlpha(uv + vec2(0.0, py)) - maskAlpha(uv - vec2(0.0, py));
  vec2 grad = vec2(aX, aY) * u_resolution;
  vec3 normal = normalize(vec3(-grad * 0.35, 1.0));

  vec2 warp = vec2(fbm(uv * u_scale + t), fbm(uv * u_scale - t + 4.2)) - 0.5;
  normal.xy += warp * u_liquid * 0.8;
  normal = normalize(normal);

  vec3 lightDir = normalize(vec3(0.35, 0.55, 0.75));
  float diff = clamp(dot(normal, lightDir), 0.0, 1.0);

  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float fresnelTerm = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 2.0 + u_fresnel * 3.0);

  vec3 base = mix(u_darkColor, u_lightColor, diff);
  base = mix(base, u_lightColor, fresnelTerm * u_fresnel);
  base *= u_tintColor;

  vec2 refractUv = uv + warp * u_refraction;
  float edgeR = maskAlpha(refractUv + vec2(u_chromaticSpread * px, 0.0));
  float edgeG = maskAlpha(refractUv);
  float edgeB = maskAlpha(refractUv - vec2(u_chromaticSpread * px, 0.0));
  vec3 chroma = vec3(edgeR, edgeG, edgeB);
  base = mix(base, base * chroma + (1.0 - chroma) * u_lightColor * 0.15, 0.5);

  base = (base - 0.5) * u_contrast + 0.5;
  base *= u_brightness;

  float alpha = smoothstep(0.35 - u_blur, 0.35 + u_blur, a);
  outColor = vec4(base, alpha);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

export default function MetallicPaint({
  imageSrc,
  seed = 0,
  scale = 3,
  liquid = 0.5,
  speed = 0.3,
  brightness = 1.4,
  contrast = 1,
  refraction = 0.01,
  blur = 0.05,
  chromaticSpread = 1,
  fresnel = 1,
  lightColor = "#ffffff",
  darkColor = "#1a1a1a",
  tintColor = "#ffffff",
  className = "",
}: MetallicPaintProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setReady(true));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!ready || !canvas) return;

    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    let raf = 0;
    let disposed = false;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      u_time: gl.getUniformLocation(program, "u_time"),
      u_seed: gl.getUniformLocation(program, "u_seed"),
      u_scale: gl.getUniformLocation(program, "u_scale"),
      u_liquid: gl.getUniformLocation(program, "u_liquid"),
      u_speed: gl.getUniformLocation(program, "u_speed"),
      u_brightness: gl.getUniformLocation(program, "u_brightness"),
      u_contrast: gl.getUniformLocation(program, "u_contrast"),
      u_refraction: gl.getUniformLocation(program, "u_refraction"),
      u_blur: gl.getUniformLocation(program, "u_blur"),
      u_chromaticSpread: gl.getUniformLocation(program, "u_chromaticSpread"),
      u_fresnel: gl.getUniformLocation(program, "u_fresnel"),
      u_lightColor: gl.getUniformLocation(program, "u_lightColor"),
      u_darkColor: gl.getUniformLocation(program, "u_darkColor"),
      u_tintColor: gl.getUniformLocation(program, "u_tintColor"),
      u_resolution: gl.getUniformLocation(program, "u_resolution"),
      u_mask: gl.getUniformLocation(program, "u_mask"),
    };

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      const size = 512;
      const off = document.createElement("canvas");
      off.width = size;
      off.height = size;
      const ctx = off.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
    };
    img.src = imageSrc;

    const [lr, lg, lb] = hexToRgb(lightColor);
    const [dr, dg, db] = hexToRgb(darkColor);
    const [tr, tg, tb] = hexToRgb(tintColor);

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.max(1, Math.round(rect.width * dpr));
      canvas!.height = Math.max(1, Math.round(rect.height * dpr));
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    function frame(time: number) {
      if (disposed) return;
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.enable(gl!.BLEND);
      gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA);

      gl!.uniform1f(uniforms.u_time, time * 0.001);
      gl!.uniform1f(uniforms.u_seed, seed);
      gl!.uniform1f(uniforms.u_scale, scale);
      gl!.uniform1f(uniforms.u_liquid, liquid);
      gl!.uniform1f(uniforms.u_speed, speed);
      gl!.uniform1f(uniforms.u_brightness, brightness);
      gl!.uniform1f(uniforms.u_contrast, contrast);
      gl!.uniform1f(uniforms.u_refraction, refraction);
      gl!.uniform1f(uniforms.u_blur, blur);
      gl!.uniform1f(uniforms.u_chromaticSpread, chromaticSpread);
      gl!.uniform1f(uniforms.u_fresnel, fresnel);
      gl!.uniform3f(uniforms.u_lightColor, lr, lg, lb);
      gl!.uniform3f(uniforms.u_darkColor, dr, dg, db);
      gl!.uniform3f(uniforms.u_tintColor, tr, tg, tb);
      gl!.uniform2f(uniforms.u_resolution, canvas!.width, canvas!.height);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, texture);
      gl!.uniform1i(uniforms.u_mask, 0);

      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
    };
  }, [
    ready,
    imageSrc,
    seed,
    scale,
    liquid,
    speed,
    brightness,
    contrast,
    refraction,
    blur,
    chromaticSpread,
    fresnel,
    lightColor,
    darkColor,
    tintColor,
  ]);

  return (
    <div className={`metallic-paint-container ${className}`}>
      <canvas ref={canvasRef} className="metallic-paint-canvas" />
    </div>
  );
}
