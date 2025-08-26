
"use client";

import React, { useEffect, useRef } from 'react';

export function GeometricBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    let particles: Particle[] = [];
    
    const resizeCanvas = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    
    class Particle {
        x: number;
        y: number;
        size: number;
        speedX: number;
        speedY: number;

        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 1.5 + 0.5;
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 - 1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.size > 0.1) this.size -= 0.01;
            if (this.x > width || this.x < 0) this.speedX *= -1;
            if (this.y > height || this.y < 0) this.speedY *= -1;
        }

        draw() {
            if (!ctx) return;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }
    }

    function init() {
      particles = [];
      for (let i = 0; i < 100; i++) {
        particles.push(new Particle());
      }
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      connect();
      requestAnimationFrame(animate);
    }
    
    function connect(){
        if (!ctx) return;
        let opacityValue = 1;
        for (let a = 0; a < particles.length; a++) {
            for (let b = a; b < particles.length; b++) {
                let distance = (( particles[a].x - particles[b].x) * (particles[a].x - particles[b].x))
                            + ((particles[a].y - particles[b].y) * (particles[a].y - particles[b].y));
                if (distance < (width/7) * (height/7)) {
                    opacityValue = 1 - (distance/20000);
                    ctx.strokeStyle=`rgba(255,255,255,${opacityValue})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }


    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    init();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full" />;
}
