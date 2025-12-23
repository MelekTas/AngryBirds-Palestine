import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

// --- PROPS ---
interface Level2Props {
  onComplete: () => void;
  onBackToMenu: () => void;
  onBackToLevelSelect: () => void;
}

// --- TİPLER ---
interface GameBody extends Matter.Body {
  gameType?: 'bird' | 'pig' | 'block' | 'ground' | 'wall' | 'particle' | 'leaf';
  hitCount?: number;
  maxHits?: number;
  damageThreshold?: number;
  isDying?: boolean;
  isFading?: boolean;
  isBroken?: boolean;
  hasCollided?: boolean;
  hasUsedAbility?: boolean; 
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

const Level2: React.FC<Level2Props> = ({ onComplete, onBackToMenu, onBackToLevelSelect }) => {
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    const handleResize = () => setGameKey(p => p + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <GameLevel 
      key={gameKey} 
      onReset={() => setGameKey(p => p + 1)} 
      onComplete={onComplete} 
      onBackToMenu={onBackToMenu} 
      onBackToLevelSelect={onBackToLevelSelect} 
    />
  );
};

// --- OYUN MANTIĞI ---
const GameLevel: React.FC<Level2Props & { onReset: () => void }> = ({ 
  onReset, 
  onComplete, 
  onBackToMenu, 
  onBackToLevelSelect 
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);

  // --- SES EFEKTLERİ REFLERİ ---
  const sounds = useRef({
    slingshot: new Audio('/audio/slingshot.mp3'),
    woodSmash: new Audio('/audio/wood-smash.mp3'),
    win: new Audio('/audio/nextlevel.wav'),
    lose: new Audio('/audio/losing.wav'),
    score: new Audio('/audio/score.mp3'), 
  });

  // UI State
  const [score, setScore] = useState(0);
  const [birdsLeft, setBirdsLeft] = useState(3);
  const [pigsLeft, setPigsLeft] = useState(4); 
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');

  // Refs
  const scoreRef = useRef(0);
  const birdsLeftRef = useRef(3);
  const pigsLeftRef = useRef(4);
  
  const currentBirdRef = useRef<GameBody | null>(null);
  const isBirdOnSlingshot = useRef(false);
  const isProcessingNextTurn = useRef(false);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // --- SES YARDIMCISI ---
  const playSound = (audio: HTMLAudioElement) => {
    audio.currentTime = 0; 
    audio.play().catch(e => console.log("Ses hatası:", e));
  };

  // --- TEXT EKLEME YARDIMCISI ---
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

  // --- YETENEK AKTİVASYONU (SPACE TUŞU İLE ÇALIŞIR) ---
  const activateSpecialAbility = () => {
    const bird = currentBirdRef.current;
    
    // Güvenlik Kontrolleri
    if (!bird) return;
    if (isBirdOnSlingshot.current) return; // Henüz fırlatılmadı
    if (bird.hasCollided) return; // Zaten çarptı
    if (bird.hasUsedAbility) return; // Zaten kullandı

    // --- AKTİVASYON ---
    addFloatingText(bird.position.x, bird.position.y - 40, "HIZLANDI!", 'special');
    
    // Burada özel bir ses eklenebilir (örneğin roket sesi), şimdilik slingshot sesini inceltip kullanabiliriz veya boş geçebiliriz.
    // playSound(sounds.current.slingshot); 

    bird.hasUsedAbility = true;

    // 1. GÖRSEL DEĞİŞİM (Mermi Şekli - Aerodinamik)
    if (bird.render && bird.render.sprite) {
         bird.render.sprite.xScale = 0.18; // Biraz uzat
         bird.render.sprite.yScale = 0.09; // İncelt
    }

    // 2. FİZİK DEĞİŞİMİ (Delici Güç)
    Matter.Body.setDensity(bird, 0.05); // Çok ağırlaştır (Tank gibi vurması için)
    bird.frictionAir = 0.0; // Hava sürtünmesi SIFIR

    // 3. HIZ VEKTÖRÜ (Fişekleme)
    const velocity = bird.velocity;
    let angle = Math.atan2(velocity.y, velocity.x);
    
    // Eğer kuş tepe noktasındaysa (yavaşsa) düz fırlat
    if (Matter.Vector.magnitude(velocity) < 1.0) angle = 0;

    const SUPER_SPEED = 45; // ÇOK YÜKSEK HIZ
    
    Matter.Body.setVelocity(bird, {
        x: Math.cos(angle) * SUPER_SPEED,
        y: Math.sin(angle) * SUPER_SPEED
    });
  };

  useEffect(() => {
    const {
      Engine, Render, Runner, World, Bodies, Mouse,
      MouseConstraint, Composite, Constraint, Events, Vector, Body, Common
    } = Matter;

    const engine = Engine.create({
      positionIterations: 30, 
      velocityIterations: 30
    });
    engineRef.current = engine;
    const world = engine.world;

    // --- SES AYARLARI ---
    sounds.current.score.volume = 0.3; // Skor sesi kısık

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
    const ghostCategory = 0x0008;

    const slingshotX = width * 0.2;
    const slingshotY = height - 170;

    // --- EFEKT FONKSİYONLARI ---
    const createLeafParticle = (x: number, y: number, isTrail: boolean = false) => {
        const size = isTrail ? Common.random(6, 10) : Common.random(8, 14);
        const color = isTrail ? '#556B2F' : '#7FFF00'; 
        
        const leaf = Bodies.polygon(x, y, 3, size, { 
            collisionFilter: { category: particleCategory, mask: 0 }, 
            frictionAir: isTrail ? 0.3 : 0.05, 
            render: { fillStyle: color } 
        }) as GameBody;
        
        leaf.gameType = 'leaf';
        leaf.lifeTime = isTrail ? 10 : 35;
        
        Body.setAngle(leaf, Common.random(0, Math.PI * 2));
        Body.setVelocity(leaf, {
            x: Common.random(-3, 3),
            y: Common.random(-3, 3)
        });
        World.add(world, leaf);
    };

    const createExplosion = (x: number, y: number, color: string = '#e6bd19') => {
      const particles: GameBody[] = [];
      for (let i = 0; i < 12; i++) { 
        const particle = Bodies.circle(x, y, Common.random(3, 8), {
          collisionFilter: { category: particleCategory },
          frictionAir: 0.05,
          render: { fillStyle: color }
        }) as GameBody;
        particle.gameType = 'particle';
        particle.lifeTime = 40;
        Body.setVelocity(particle, {
          x: Common.random(-8, 8),
          y: Common.random(-8, 8)
        });
        particles.push(particle);
      }
      World.add(world, particles);
    };

    // --- NESNE OLUŞTURUCULAR ---
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
        restitution: 0.1
      });
      block.gameType = 'block';
      block.hitCount = 0;
      block.maxHits = 2; 
      block.damageThreshold = 6.0; 
      block.isBroken = false;
      block.isFading = false;
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

    // --- KUŞLARI HAZIRLA ---
    let waitingBirdsBodies: GameBody[] = [];
    const updateWaitingBirdsVisuals = () => {
      waitingBirdsBodies.forEach(b => World.remove(world, b));
      waitingBirdsBodies = [];
      const birdsOnGround = birdsLeftRef.current - 1;
      for (let i = 0; i < birdsOnGround; i++) {
        const bird = Bodies.circle(slingshotX - 40 - (i * 35), slingshotY + 120, 15, {
          isStatic: true, isSensor: true,
          render: { sprite: { texture: '/image/bird/zaytun.png', xScale: 0.13, yScale: 0.13 } }
        }) as GameBody;
        waitingBirdsBodies.push(bird);
        World.add(world, bird);
      }
    };

    let slingshotConstraint: Matter.Constraint | null = null;

    const spawnBird = () => {
      if (birdsLeftRef.current <= 0) return;
      updateWaitingBirdsVisuals();

      const birdOptions: Matter.IBodyDefinition = {
        density: 0.0015,
        restitution: 0.4,
        frictionAir: 0.01, 
        collisionFilter: { category: birdCategory },
        render: { sprite: { texture: '/image/bird/zaytun.png', xScale: 0.13, yScale: 0.13 } }
      };

      const newBird = Bodies.circle(slingshotX, slingshotY, 15, birdOptions) as GameBody;
      newBird.gameType = 'bird';
      newBird.hasCollided = false;
      newBird.hasUsedAbility = false; 
      
      currentBirdRef.current = newBird;
      World.add(world, newBird);

      slingshotConstraint = Constraint.create({
        pointA: { x: slingshotX, y: slingshotY },
        bodyB: newBird,
        stiffness: 0.012,
        damping: 0.01, 
        length: 1,
        render: { visible: false }
      });
      World.add(world, slingshotConstraint);
      isBirdOnSlingshot.current = true;
      isProcessingNextTurn.current = false;
    };

    // --- KLAVYE DİNLEYİCİSİ ---
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'Tab') {
            e.preventDefault(); 
            activateSpecialAbility();
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    // --- LEVEL 2 GEOMETRİSİ (GENİŞ TABAN & BÜYÜK KRAL) ---
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
    const startX = width * 0.75; 
    
    const T = 15; // Tahta kalınlığı (Sabit ince)
    const GAP = 90; // Sütunlar arası mesafe (Bayağı açtık)

    // 1. ANA KULE - KAT 1 (Geniş Zemin)
    // 3 adet dikey ince sütun (Araları açık)
    const col1 = createBlock(startX - GAP, groundY - 50, T, 100, '/image/block/block2.png');
    const col2 = createBlock(startX,       groundY - 50, T, 100, '/image/block/block2.png');
    const col3 = createBlock(startX + GAP, groundY - 50, T, 100, '/image/block/block2.png');
    
    // Kat 1 Domuzları (Açılan boşluklara yerleştirdik)
    const pigBottom1 = createPig(startX - (GAP / 2), groundY - 20);
    const pigBottom2 = createPig(startX + (GAP / 2), groundY - 20);

    // 2. ANA KULE - ZEMİN TAVANI
    // Sütunlar açıldığı için bu tahtayı uzattık (220px yaptık)
    const plank1 = createBlock(startX, groundY - 100 - (T/2), 220, T, '/image/block/block2.png');

    // 3. ANA KULE - KAT 2 (Daha dar, piramit şekli için)
    const col4 = createBlock(startX - 40, groundY - 100 - T - 40, T, 80, '/image/block/block2.png');
    const col5 = createBlock(startX + 40, groundY - 100 - T - 40, T, 80, '/image/block/block2.png');
    
    // Kat 2 Domuzu
    const pigMiddle = createPig(startX, groundY - 100 - T - 20);

    // 4. ANA KULE - ÇATI
    const plank2 = createBlock(startX, groundY - 100 - T - 80 - (T/2), 120, T, '/image/block/block2.png');

    // 5. EN TEPE (Kral Dairesi)
    const topSupp1 = createBlock(startX - 30, groundY - 200, T, 40, '/image/block/block2.png');
    const topSupp2 = createBlock(startX + 30, groundY - 200, T, 40, '/image/block/block2.png');
    const topRoof  = createBlock(startX,      groundY - 220 - (T/2), 100, T, '/image/block/block2.png');
    
    // --- KRAL DOMUZ (Özel Yapım - Daha Büyük) ---
    // createPig fonksiyonunu kullanmıyoruz, elle yapıyoruz ki büyük olsun.
    const pigKing: GameBody = Bodies.circle(startX, groundY - 220 - T - 30, 30, { // Yarıçap 30 (Normali 20)
        collisionFilter: { category: defaultCategory },
        render: { 
            sprite: { 
                texture: '/image/pig/pig.png', 
                xScale: 0.25, // Daha büyük görsel (Normali 0.18)
                yScale: 0.25 
            } 
        },
        density: 0.002,
        friction: 0.5
    });
    pigKing.gameType = 'pig';
    pigKing.isDying = false;
    pigKing.lastHitTime = 0;

    Composite.add(structure, [
        col1, col2, col3, pigBottom1, pigBottom2,
        plank1,
        col4, col5, pigMiddle,
        plank2,
        topSupp1, topSupp2, topRoof, pigKing
    ]);

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

    // --- YERÇEKİMİ İPTALİ (UPDATE LOOP) ---
    // Hızlanan kuş düz gitsin diye yerçekimini ona özel iptal ediyoruz
    Events.on(engine, 'beforeUpdate', () => {
        const bird = currentBirdRef.current;
        if (bird && bird.hasUsedAbility && !bird.hasCollided) {
            Body.applyForce(bird, bird.position, {
                x: 0,
                y: -engine.gravity.y * engine.gravity.scale * bird.mass
            });
        }
    });

    // --- EVENTS (MOUSEDOWN - SAPAN SESİ) ---
    Events.on(mouseConstraint, 'mousedown', (e: any) => {
      if (e.source.body === currentBirdRef.current && isBirdOnSlingshot.current) {
        playSound(sounds.current.slingshot); 
      }
    });

    // --- ÇARPIŞMA VE ETKİLEŞİM ---
    Events.on(mouseConstraint, 'enddrag', (e: any) => {
      if (e.body === currentBirdRef.current && isBirdOnSlingshot.current) {
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

        const handleBirdCollision = (body: GameBody) => {
          if (body.gameType === 'bird' && !body.hasCollided && !isBirdOnSlingshot.current) {
            body.hasCollided = true; 
            
            body.frictionAir = 0.05; 
            if (body.render && body.render.sprite) {
                // Şekli normale döndür
                body.render.sprite.xScale = 0.13;
                body.render.sprite.yScale = 0.13;
            }

            for(let k=0; k<6; k++) createLeafParticle(body.position.x, body.position.y, false);

            setTimeout(() => {
              if(body.render) body.render.visible = false; 
              setTimeout(() => World.remove(world, body), 0);
              if (currentBirdRef.current === body) currentBirdRef.current = null;

              if (pigsLeftRef.current > 0 && birdsLeftRef.current > 0) {
                if (!isProcessingNextTurn.current) {
                  isProcessingNextTurn.current = true;
                  setTimeout(spawnBird, 500);
                }
              } else if (pigsLeftRef.current > 0 && birdsLeftRef.current <= 0) {
                setGameState('lost');
                playSound(sounds.current.lose); // KAYBETME SESİ
              }
            }, 2500);
          }
        };

        if (bodyA.gameType === 'bird') handleBirdCollision(bodyA);
        if (bodyB.gameType === 'bird') handleBirdCollision(bodyB);

        const speedVector = Vector.sub(bodyA.velocity, bodyB.velocity);
        const impactForce = Vector.magnitude(speedVector);

        // --- SPACE İLE HIZLANINCA HASAR ÇARPANI ARTAR ---
        let damageMultiplier = 1.0;
        if ((bodyA.gameType === 'bird' && bodyA.hasUsedAbility) || (bodyB.gameType === 'bird' && bodyB.hasUsedAbility)) {
            damageMultiplier = 10.0; // 10 KAT DAHA GÜÇLÜ VURUR
        }

        if (impactForce < 2.0) return;

        const applyDamage = (body: GameBody) => {
          if (body.isDying || body.isBroken || body.isFading) return;

          // --- DOMUZ MANTIĞI ---
          if (body.gameType === 'pig' && impactForce > 3.0) {
            body.isDying = true;
            if (body.render.sprite) body.render.sprite.texture = '/image/pig/diepig.png';
            Body.setStatic(body, true);
            body.collisionFilter = { ...body.collisionFilter, mask: 0 };
            pigsLeftRef.current -= 1;
            setPigsLeft(pigsLeftRef.current);
            
            setTimeout(() => {
              if (!body || !body.position) return;
              const pos = { ...body.position };
              if(body.render) body.render.visible = false;
              body.isSensor = true;
              setTimeout(() => Composite.remove(world, body), 0);
              createExplosion(pos.x, pos.y, '#32CD32');
              
              setTimeout(() => {
                scoreRef.current += 150;
                setScore(scoreRef.current);
                playSound(sounds.current.score); // DOMUZ SKOR SESİ

                if (pigsLeftRef.current <= 0) {
                  setTimeout(() => {
                    setGameState('won');
                    playSound(sounds.current.win); // KAZANMA SESİ
                  }, 1000);
                }
              }, 200);
            }, 300);
          }
          // --- BLOK MANTIĞI ---
          else if (body.gameType === 'block') {
            const effectiveThreshold = damageMultiplier > 1 ? 0.5 : (body.damageThreshold || 6);

            if (impactForce > effectiveThreshold) {
              playSound(sounds.current.woodSmash); // TAHTA KIRILMA SESİ

              body.hitCount = (body.hitCount || 0) + (1 * damageMultiplier);

              if (body.hitCount >= 1 && body.hitCount < (body.maxHits || 2)) {
                if (body.render) body.render.opacity = 0.7;
              }

              if (body.maxHits && body.hitCount >= body.maxHits) {
                body.isBroken = true; 
                body.isFading = true;
                body.collisionFilter = { category: ghostCategory, mask: 0 };
                if (body.position) {
                  createExplosion(body.position.x, body.position.y, '#e6bd19');
                  addFloatingText(body.position.x, body.position.y, "+50", 'score');
                }
                scoreRef.current += 50;
                setScore(scoreRef.current);
                playSound(sounds.current.score); // BLOK SKOR SESİ
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
      const bird = currentBirdRef.current;

      if (bird && isBirdOnSlingshot.current) {
        ctx.beginPath();
        ctx.moveTo(slingshotX - 15, slingshotY);
        ctx.lineTo(bird.position.x, bird.position.y);
        ctx.lineTo(slingshotX + 15, slingshotY);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#301808';
        ctx.stroke();
      }

      // Trail Effect (İz bırakma)
      if (bird && bird.hasUsedAbility && !bird.hasCollided) {
           const speed = Vector.magnitude(bird.velocity);
           if (speed > 1) {
                const normX = bird.velocity.x / speed;
                const normY = bird.velocity.y / speed;
                // Arkasından yapraklar dökülür
                createLeafParticle(bird.position.x - (normX * 25), bird.position.y - (normY * 25), true);
           }
      }

      // Text Render
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ctx.save();
        ctx.translate(ft.x, ft.y);

        if (ft.type === 'special') {
          const progress = 1 - (ft.life / ft.maxLife);
          let alpha = 1;
          if (progress < 0.2) alpha = progress * 5;
          else if (progress > 0.8) alpha = (1 - progress) * 5;
          const scale = 0.95 + (progress * 0.05);

          ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
          ctx.scale(scale, scale);
          ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
          ctx.shadowBlur = 4;
          ctx.font = "900 24px Arial";
          ctx.fillStyle = "#f2f2f2";
          const metrics = ctx.measureText(ft.text);
          ctx.fillText(ft.text, -metrics.width / 2, 0);
        } else {
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

      // Fade Effects
      try {
        const bodies = Composite.allBodies(world) as GameBody[];
        bodies.forEach((body) => {
          if (body.isFading && body.render && typeof body.render.opacity === 'number') {
            body.render.opacity -= 0.05; 
            if (body.render.opacity <= 0) {
               World.remove(world, body);
            }
          }
          if (body.gameType === 'particle' || body.gameType === 'leaf') {
            if (body.lifeTime && body.lifeTime > 0) {
              body.lifeTime--;
              if (body.render) {
                  const maxLife = body.gameType === 'leaf' ? (body.isSensor ? 10 : 35) : 40;
                  body.render.opacity = body.lifeTime / maxLife;
              }
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
      window.removeEventListener('keydown', handleKeyDown);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
    };
  }, [onReset]);

  return (
    // Ekrana tıklayınca da hızlanması için onClick ekledik
    <div 
      onClick={() => activateSpecialAbility()} 
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        overflow: 'hidden',
        backgroundImage: "url('/image/backgraound/bg_palestine.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        touchAction: 'none'
      }}
    >
      <div style={{
        position: 'absolute', top: 15, width: '100%', textAlign: 'center',
        fontSize: '24px', fontWeight: 'bold', color: 'white', textShadow: '2px 2px 4px #000',
        zIndex: 20, pointerEvents: 'none', userSelect: 'none'
      }}>Angry Birds: Filistin - Level 2 (Zaytun Hücumu)</div>

      <div style={{
        position: 'absolute', top: 20, left: 20, display: 'flex', flexDirection: 'column', gap: '8px',
        fontFamily: 'Arial', fontWeight: 'bold', color: 'white', zIndex: 20, textShadow: '2px 2px 3px black', pointerEvents: 'none', userSelect: 'none'
      }}>
        <div style={{ fontSize: '28px', color: '#FFD700' }}>SKOR: {score}</div>
        <div style={{ fontSize: '20px' }}>KUŞLAR: {birdsLeft}</div>
        <div style={{ fontSize: '14px', color: '#88e' }}>(SPACE: Hızlan)</div>
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
              <button onClick={(e) => { e.stopPropagation(); onReset(); }} style={buttonStyle('#2196F3')}>🔄 TEKRAR ET</button>
              {gameState === 'won' && <button onClick={(e) => { e.stopPropagation(); onComplete(); }} style={buttonStyle('#FF9800')}>⏩ SONRAKİ SEVİYE</button>}
              <button onClick={(e) => { e.stopPropagation(); onBackToLevelSelect(); }} style={buttonStyle('#9E9E9E')}>📋 SEVİYE SEÇ</button>
              <button onClick={(e) => { e.stopPropagation(); onBackToMenu(); }} style={buttonStyle('#757575')}>🏠 ANA MENÜ</button>
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

export default Level2;