import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

// --- NESNE TİPLERİ ---
interface GameBody extends Matter.Body {
  gameType?: 'bird' | 'pig' | 'block' | 'ground' | 'wall' | 'particle';
  hitCount?: number;
  maxHits?: number;
  damageThreshold?: number;
  isDying?: boolean;
  isBroken?: boolean;
  hasCollided?: boolean;
  lifeTime?: number;
  lastHitTime?: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  type: 'score' | 'special';
}

const Game: React.FC = () => {
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    const handleResize = () => setGameKey(p => p + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <GameLevel key={gameKey} onReset={() => setGameKey(p => p + 1)} />;
};

const GameLevel: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);

  // UI State
  const [score, setScore] = useState(0);
  const [birdsLeft, setBirdsLeft] = useState(3);
  const [pigsLeft, setPigsLeft] = useState(3);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');

  // Refs
  const scoreRef = useRef(0);
  const birdsLeftRef = useRef(3);
  const pigsLeftRef = useRef(3);
  const isBirdOnSlingshot = useRef(false);
  const isProcessingNextTurn = useRef(false);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  useEffect(() => {
    const {
      Engine, Render, Runner, World, Bodies, Mouse,
      MouseConstraint, Composite, Constraint, Events, Vector, Body, Common
    } = Matter;

    const engine = Engine.create({
      positionIterations: 10,
      velocityIterations: 10
    });
    engineRef.current = engine;
    const world = engine.world;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    const render = Render.create({
      element: sceneRef.current as HTMLElement,
      engine: engine,
      options: {
        width: width,
        height: height,
        wireframes: false,
        background: 'transparent',
        pixelRatio: pixelRatio
      }
    });

    const defaultCategory = 0x0001;
    const birdCategory = 0x0002;
    const particleCategory = 0x0004;

    const slingshotX = width * 0.2;
    const slingshotY = height - 170;

    // --- TEXT EFEKTLERİ ---
    const addFloatingText = (x: number, y: number, text: string, type: 'score' | 'special' = 'score') => {
      const life = type === 'special' ? 150 : 60;
      floatingTextsRef.current.push({
        id: Math.random(),
        x, y, text,
        life: life,
        maxLife: life,
        type
      });
    };

    // --- PATLAMA EFEKTİ (RENK DESTEKLİ) ---
    // color parametresi eklendi: Bloklar için sarı, Domuzlar için yeşil
    const createExplosion = (x: number, y: number, color: string = '#e6bd19') => {
      const particles: GameBody[] = [];
      for (let i = 0; i < 10; i++) { // Parçacık sayısını biraz artırdım
        const particle = Bodies.circle(x, y, Common.random(3, 6), {
          collisionFilter: { category: particleCategory },
          frictionAir: 0.05,
          render: { fillStyle: color }
        }) as GameBody;
        particle.gameType = 'particle';
        particle.lifeTime = 40;
        Body.setVelocity(particle, {
          x: Common.random(-7, 7), // Hız dağılımını artırdım
          y: Common.random(-7, 7)
        });
        particles.push(particle);
      }
      World.add(world, particles);
    };

    // --- BLOK OLUŞTURMA ---
    const createBlock = (x: number, y: number, w: number, h: number, texture: string) => {
      const block: GameBody = Bodies.rectangle(x, y, w, h, {
        collisionFilter: { category: defaultCategory },
        render: {
          sprite: { texture, xScale: (w / 100) * 0.94, yScale: (h / 100) * 0.94 },
          opacity: 1
        },
        density: 0.005,
        friction: 0.9,
        frictionStatic: 1.0,
        restitution: 0.1 // Biraz sekme ekledim ki fizik daha canlı olsun
      });

      block.gameType = 'block';
      block.hitCount = 0;
      block.maxHits = 2; // 2. darbede kırılacak
      block.damageThreshold = 3.5; // Eşiği biraz düşürdüm, daha kolay kırılsın
      block.isBroken = false;
      block.lastHitTime = 0;
      return block;
    };

    const createPig = (x: number, y: number) => {
      const pig: GameBody = Bodies.circle(x, y, 20, {
        collisionFilter: { category: defaultCategory },
        render: { sprite: { texture: '/image/pig/pig.png', xScale: 0.18, yScale: 0.18 } },
        density: 0.002,
        friction: 0.5
      });
      pig.gameType = 'pig';
      pig.isDying = false;
      pig.lastHitTime = 0;
      return pig;
    };

    // --- LEVEL SETUP ---
    let waitingBirdsBodies: GameBody[] = [];
    const updateWaitingBirdsVisuals = () => {
      waitingBirdsBodies.forEach(b => World.remove(world, b));
      waitingBirdsBodies = [];
      const birdsOnGround = birdsLeftRef.current - 1;
      for (let i = 0; i < birdsOnGround; i++) {
        const bird = Bodies.circle(slingshotX - 40 - (i * 35), slingshotY + 120, 15, {
          isStatic: true, isSensor: true,
          render: { sprite: { texture: '/image/bird/hatta.png', xScale: 0.12, yScale: 0.12 } }
        }) as GameBody;
        waitingBirdsBodies.push(bird);
        World.add(world, bird);
      }
    };

    let currentBird: GameBody | null = null;
    let slingshotConstraint: Matter.Constraint | null = null;

    const spawnBird = () => {
      if (birdsLeftRef.current <= 0) return;
      updateWaitingBirdsVisuals();

      const birdOptions: Matter.IBodyDefinition = {
        density: 0.004, restitution: 0.4, frictionAir: 0.01,
        collisionFilter: { category: birdCategory },
        render: { sprite: { texture: '/image/bird/hatta.png', xScale: 0.12, yScale: 0.12 } }
      };

      currentBird = Bodies.circle(slingshotX, slingshotY, 15, birdOptions) as GameBody;
      currentBird.gameType = 'bird';
      currentBird.hasCollided = false;
      World.add(world, currentBird);

      slingshotConstraint = Constraint.create({
        pointA: { x: slingshotX, y: slingshotY },
        bodyB: currentBird,
        stiffness: 0.02, damping: 0.01, length: 1,
        render: { visible: false }
      });
      World.add(world, slingshotConstraint);
      isBirdOnSlingshot.current = true;
      isProcessingNextTurn.current = false;
    };

    // --- LEVEL GEOMETRİSİ ---
    const ground = Bodies.rectangle(width / 2, height - 10, width, 60, {
      isStatic: true, render: { visible: false }, gameType: 'ground', friction: 1
    } as GameBody);

    const leftWall = Bodies.rectangle(-20, height / 2, 40, height * 2, { isStatic: true, render: { visible: false } });
    const rightWall = Bodies.rectangle(width + 20, height / 2, 40, height * 2, { isStatic: true, render: { visible: false } });
    const ceiling = Bodies.rectangle(width / 2, -500, width, 50, { isStatic: true, render: { visible: false } });

    const slingshotImage = Bodies.rectangle(slingshotX, slingshotY + 40, 40, 100, {
      isStatic: true, isSensor: true,
      render: { sprite: { texture: '/image/objects/sapan.png', xScale: 0.4, yScale: 0.4 } }
    });

    const structure = Composite.create();
    const groundY = height - 40;
    const startX = width * 0.6;
    const gap = 1;
    const colHeight = 120;
    const l1Y = groundY - gap - (colHeight / 2);

    const col1 = createBlock(startX - 100, l1Y, 120, 20, '/image/block/block2.png'); Body.rotate(col1, Math.PI / 2);
    const col2 = createBlock(startX, l1Y, 120, 20, '/image/block/block2.png'); Body.rotate(col2, Math.PI / 2);
    const col3 = createBlock(startX + 100, l1Y, 120, 20, '/image/block/block2.png'); Body.rotate(col3, Math.PI / 2);
    const platform1 = createBlock(startX, groundY - 120 - 10 - (gap * 2), 260, 20, '/image/block/block2.png');

    const level1Top = groundY - 120 - 20 - (gap * 2);
    const pigLeft = createPig(startX - 80, level1Top - 20);
    const pigRight = createPig(startX + 80, level1Top - 20);
    const pigTop = createPig(startX, level1Top - 60 - 20 - 20 - gap);

    const blockL1 = createBlock(startX - 120, level1Top - 30, 60, 20, '/image/block/block2.png'); Body.rotate(blockL1, Math.PI / 2);
    const blockR1 = createBlock(startX + 120, level1Top - 30, 60, 20, '/image/block/block2.png'); Body.rotate(blockR1, Math.PI / 2);
    const platform2 = createBlock(startX, level1Top - 60 - 10, 260, 20, '/image/block/block2.png');

    Composite.add(structure, [col1, col2, col3, platform1, pigLeft, pigRight, blockL1, blockR1, platform2, pigTop]);
    World.add(world, [ground, leftWall, rightWall, ceiling, slingshotImage, structure]);

    const mouse = Mouse.create(render.canvas);
    mouse.pixelRatio = pixelRatio;
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
      collisionFilter: { mask: birdCategory }
    });
    World.add(world, mouseConstraint);

    setTimeout(() => spawnBird(), 100);

    // --- EVENTS & HASAR MANTIĞI ---
    Events.on(mouseConstraint, 'enddrag', (e: any) => {
      if (e.body === currentBird && isBirdOnSlingshot.current) {
        isBirdOnSlingshot.current = false;
        setTimeout(() => {
          if (slingshotConstraint) slingshotConstraint.bodyB = null;
          birdsLeftRef.current -= 1;
          setBirdsLeft(birdsLeftRef.current);
        }, 20);
      }
    });

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA as GameBody;
        const bodyB = pair.bodyB as GameBody;
        if (!bodyA || !bodyB) return;

        // Kuş işlemleri
        const handleBirdCollision = (body: GameBody) => {
          if (body.gameType === 'bird' && !body.hasCollided && !isBirdOnSlingshot.current) {
            body.hasCollided = true;
            setTimeout(() => {
              if (body) World.remove(world, body);
              if (pigsLeftRef.current > 0 && birdsLeftRef.current > 0) {
                if (!isProcessingNextTurn.current) {
                  isProcessingNextTurn.current = true;
                  setTimeout(spawnBird, 500);
                }
              } else if (pigsLeftRef.current > 0 && birdsLeftRef.current <= 0) {
                setGameState('lost');
              }
            }, 2500);
          }
        };

        if (bodyA.gameType === 'bird') handleBirdCollision(bodyA);
        if (bodyB.gameType === 'bird') handleBirdCollision(bodyB);

        // Hasar Hesaplama
        const speedVector = Vector.sub(bodyA.velocity, bodyB.velocity);
        const impactForce = Vector.magnitude(speedVector);

        // Global minimum darbe eşiği (Hafif dokunuşlar zarar vermez)
        if (impactForce < 2) return;

        const applyDamage = (body: GameBody) => {
          if (body.isDying || body.isBroken) return;

          const now = Date.now();
          if (body.lastHitTime && now - body.lastHitTime < 200) return;
          body.lastHitTime = now;

          // --- DOMUZ MANTIĞI ---
          // Domuzlar için darbe eşiğini 5'ten 3'e düşürdüm.
          // Böylece üzerine blok yıkıldığında da ölebilecekler.
          if (body.gameType === 'pig' && impactForce > 3) {
            body.isDying = true;

            // 1. Görsel Değişim: Korkmuş/Ölü domuz yüzü
            if (body.render.sprite) body.render.sprite.texture = '/image/pig/diepig.png';

            // 2. Fizik: Sabitle ve Çarpışmayı Kapat (Böylece diğer bloklar içinden geçer)
            Body.setStatic(body, true);
            body.collisionFilter = { ...body.collisionFilter, mask: 0 };

            // Puan ve Sayaç Güncelleme
            pigsLeftRef.current -= 1;
            setPigsLeft(pigsLeftRef.current);

            // 3. YOK OLUŞ VE EFEKT
            // Önceki 2000ms yerine 300ms yaptık. Yüzü anlık görüp yok olacak.
            setTimeout(() => {
              if (!body || !body.position) return;
              const { x, y } = body.position;

              // YEŞİL PATLAMA (#32CD32)
              createExplosion(x, y, '#32CD32');
              
              // Sinematik Yazı - Domuz silindikten hemen sonra
              addFloatingText(x, y - 90, "SOYKIRIMCI ÖLDÜ", 'special');
              addFloatingText(x, y - 50, "+150", 'score');

              // SAHNEDEN SİL
              World.remove(world, body);
              
              scoreRef.current += 150;
              setScore(scoreRef.current);

              if (pigsLeftRef.current <= 0) {
                setTimeout(() => setGameState('won'), 2000);
              }
            }, 300); // 300ms sonra patlar
          }
          // --- BLOK MANTIĞI ---
          else if (body.gameType === 'block') {
            if (body.damageThreshold && impactForce > body.damageThreshold) {
              body.hitCount = (body.hitCount || 0) + 1;

              // Görsel Saydamlaşma
              if (body.render) {
                if (body.hitCount === 1) body.render.opacity = 0.7; // İlk vuruşta biraz daha belirgin saydamlık
                else if (body.hitCount >= 2) body.render.opacity = 0.3;
              }

              // Kırılma Kontrolü (2. vuruşta KIRILIR ve YOK OLUR)
              if (body.maxHits && body.hitCount >= body.maxHits) {
                body.isBroken = true;
                
                // Anında tepki verip yok et
                if (body.position) {
                  createExplosion(body.position.x, body.position.y, '#e6bd19'); // Sarı/Taş rengi patlama
                  addFloatingText(body.position.x, body.position.y, "+50", 'score');
                }
                
                World.remove(world, body); // SAHNEDEN SİLİNİYOR
                scoreRef.current += 50;
                setScore(scoreRef.current);
              }
            }
          }
        };

        if (bodyA.gameType === 'pig' || bodyA.gameType === 'block') applyDamage(bodyA);
        if (bodyB.gameType === 'pig' || bodyB.gameType === 'block') applyDamage(bodyB);
      });
    });

    // --- RENDER LOOP ---
    Events.on(render, 'afterRender', () => {
      const ctx = render.context;

      if (currentBird && isBirdOnSlingshot.current) {
        ctx.beginPath();
        ctx.moveTo(slingshotX - 15, slingshotY);
        ctx.lineTo(currentBird.position.x, currentBird.position.y);
        ctx.lineTo(slingshotX + 15, slingshotY);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#301808';
        ctx.stroke();
      }

      // TEXT RENDER
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ctx.save();
        ctx.translate(ft.x, ft.y);

        if (ft.type === 'special') {
          // --- SİNEMATİK YAZI STİLİ ---
          const progress = 1 - (ft.life / ft.maxLife);
          
          let alpha = 1;
          if (progress < 0.2) alpha = progress * 5;
          else if (progress > 0.8) alpha = (1 - progress) * 5;
          
          const scale = 0.95 + (progress * 0.05);

          ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
          ctx.scale(scale, scale);

          ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          ctx.font = "900 24px Arial";
          ctx.fillStyle = "#f2f2f2";
          
          const metrics = ctx.measureText(ft.text);
          ctx.fillText(ft.text, -metrics.width / 2, 0);

        } else {
          // --- STANDART SKOR STİLİ ---
          const alpha = ft.life / 60;
          ctx.globalAlpha = alpha;
          ctx.font = "bold 26px Arial";
          ctx.fillStyle = "#FFD700";
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1;
          ctx.fillText(ft.text, 0, 0);
          ctx.strokeText(ft.text, 0, 0);
          ft.y -= 1.5;
        }

        ctx.restore();
        ft.life--;
        if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
      }

      // Particle update
      try {
        Composite.allBodies(world).forEach((body: GameBody) => {
          if (body.gameType === 'particle') {
            if (body.lifeTime && body.lifeTime > 0) {
              body.lifeTime--;
              body.render.opacity = body.lifeTime / 40;
            } else {
              World.remove(world, body);
            }
          }
        });
      } catch (e) { }
    });

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
    };
  }, [onReset]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      overflow: 'hidden',
      backgroundImage: "url('/image/backgraound/bg_palestine.png')",
      backgroundSize: 'cover', backgroundPosition: 'center'
    }}>
      <div style={{
        position: 'absolute', top: 15, width: '100%', textAlign: 'center',
        fontSize: '24px', fontWeight: 'bold', color: 'white', textShadow: '2px 2px 4px #000',
        zIndex: 20, pointerEvents: 'none', userSelect: 'none'
      }}>Angry Birds: Filistin - Level 1</div>

      <div style={{
        position: 'absolute', top: 20, left: 20, display: 'flex', flexDirection: 'column', gap: '8px',
        fontFamily: 'Arial', fontWeight: 'bold', color: 'white', zIndex: 20, textShadow: '2px 2px 3px black', pointerEvents: 'none', userSelect: 'none'
      }}>
        <div style={{ fontSize: '28px', color: '#FFD700' }}>SKOR: {score}</div>
        <div style={{ fontSize: '20px' }}>KUŞLAR: {birdsLeft}</div>
      </div>

      <div style={{
        position: 'absolute', top: 20, right: 30, display: 'flex', alignItems: 'center', gap: '10px',
        fontFamily: 'Arial', fontWeight: 'bold', color: 'white', zIndex: 20, textShadow: '2px 2px 3px black', pointerEvents: 'none', userSelect: 'none'
      }}>
        <img src="/image/pig/pig.png" alt="Pig" style={{ width: '35px', height: '35px' }} />
        <span style={{ fontSize: '28px' }}>x {pigsLeft}</span>
      </div>

      <div ref={sceneRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, touchAction: 'none' }} />

      {gameState !== 'playing' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '50px', borderRadius: '25px', textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: '350px', border: '5px solid #3E2723'
          }}>
            <h1 style={{ color: gameState === 'won' ? '#4CAF50' : '#f44336', fontSize: '42px', margin: '0 0 10px 0' }}>
              {gameState === 'won' ? 'TEBRİKLER!' : 'KAYBETTİNİZ!'}
            </h1>
            <p style={{ fontSize: '24px', marginBottom: '30px', fontWeight: 'bold', color: '#555' }}>Toplam Skor: {score}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button onClick={onReset} style={buttonStyle('#2196F3')}>🔄 TEKRAR ET</button>
              {gameState === 'won' && <button onClick={() => alert("Yakında!")} style={buttonStyle('#FF9800')}>⏩ İLERLE</button>}
              <button onClick={() => window.location.reload()} style={buttonStyle('#9E9E9E')}>🏠 ANA MENÜ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const buttonStyle = (bgColor: string) => ({
  padding: '15px 30px', fontSize: '20px', cursor: 'pointer', backgroundColor: bgColor,
  color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold',
  transition: 'transform 0.1s', boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
} as React.CSSProperties);

export default Game;
