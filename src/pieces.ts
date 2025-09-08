import type { Shape } from "./types.js";

// Набір базових фігур Block-Blast-подібних (без обертання, як в оригіналі)
const SHAPES: Shape[] = [
  // одиничні
  [{ x:0, y:0 }],
  // 2-линії
  [{x:0,y:0},{x:1,y:0}],
  [{x:0,y:0},{x:0,y:1}],
  // 3-линії
  [{x:0,y:0},{x:1,y:0},{x:2,y:0}],
  [{x:0,y:0},{x:0,y:1},{x:0,y:2}],
  // квадрати
  [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}],
  // L- та Г-подібні
  [{x:0,y:0},{x:0,y:1},{x:1,y:1}],
  [{x:0,y:0},{x:1,y:0},{x:1,y:1}],
  // довгі
  [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}],
  [{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:0,y:3}],
  // Т-подібна
  [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:1,y:1}],
];

export function randomPiece(): Shape {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}
