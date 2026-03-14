export type MarketSpecOption = {
  id: string;
  label: string;
  description: string;
  priceDelta: number;
};

export type MarketSpecGroup = {
  id: string;
  label: string;
  helper: string;
  options: MarketSpecOption[];
};

export type MarketFaq = {
  question: string;
  answer: string;
};

export type MarketProduct = {
  productId: number;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  leadTime: string;
  stock: number;
  basePrice: number;
  badges: string[];
  materials: string[];
  deliverables: string[];
  scenes: string[];
  serviceSteps: string[];
  specGroups: MarketSpecGroup[];
  faqs: MarketFaq[];
};

const marketProducts: MarketProduct[] = [
  {
    productId: 5101,
    slug: 'standee-custom',
    title: '立牌定制',
    subtitle: '把角色、回忆与情绪立起来，变成桌面上可被看见的陪伴。',
    summary: '适合 OC、同人应援、纪念礼物与桌搭陈列。',
    description:
      '高透亚克力结合高精度 UV 彩印，支持单人、双人、带背景等多种构图。我们会先整理你的设定与参考，再输出适合立牌的版式与切边方案。',
    leadTime: '打样 7-10 天，确认后 12-15 天发货',
    stock: 18,
    basePrice: 89,
    badges: ['支持双面印刷', '可加背景板', '可选星砂底座'],
    materials: ['高透亚克力', 'UV 彩印', '防刮保护膜'],
    deliverables: ['成品立牌 1 件', '独立包装', '排版确认图'],
    scenes: ['角色纪念', '应援周边', '生日礼物'],
    serviceSteps: ['提交角色/照片与灵感', '客服梳理构图与版式', '确认打样图后排产', '质检完成并寄出'],
    specGroups: [
      {
        id: 'size',
        label: '尺寸',
        helper: '尺寸越大，人物和配件细节越完整。',
        options: [
          { id: '8cm', label: '8cm', description: '适合桌搭与试做款', priceDelta: 0 },
          { id: '12cm', label: '12cm', description: '最热门的标准尺寸', priceDelta: 36 },
          { id: '16cm', label: '16cm', description: '更适合复杂背景与双人构图', priceDelta: 78 }
        ]
      },
      {
        id: 'print',
        label: '印刷方式',
        helper: '双面与局部工艺会提升展示感。',
        options: [
          { id: 'single', label: '单面彩印', description: '标准成品方案', priceDelta: 0 },
          { id: 'double', label: '双面彩印', description: '背面可放设定或补充细节', priceDelta: 28 },
          { id: 'special', label: '双面 + 局部闪砂', description: '适合舞台感与高光氛围', priceDelta: 56 }
        ]
      },
      {
        id: 'base',
        label: '底座配置',
        helper: '底座可以额外呈现主题文字与小物。',
        options: [
          { id: 'plain', label: '标准底座', description: '纯色透明底座', priceDelta: 0 },
          { id: 'scene', label: '场景底座', description: '加入场景图案与配色', priceDelta: 22 },
          { id: 'shaker', label: '流沙底座', description: '动态效果更强，适合礼物款', priceDelta: 65 }
        ]
      }
    ],
    faqs: [
      {
        question: '可以做真人照片转立牌吗？',
        answer: '可以，支持照片转绘与纪念向排版，客服会先确认风格与你希望保留的情绪氛围。'
      },
      {
        question: '是否支持一套多枚？',
        answer: '支持，确认单枚方案后可扩展为同主题系列，多枚会单独核算优惠。'
      },
      {
        question: '能否加名字或纪念日期？',
        answer: '可以，人物名、节日文字、纪念日落款都可以整合进底座或背景设计。'
      }
    ]
  },
  {
    productId: 5102,
    slug: 'acrylic-custom',
    title: '亚克力定制',
    subtitle: '适合做成挂件、砖、票夹和小型摆件，把故事装进更轻巧的日常物件。',
    summary: '轻量周边向定制，适合送礼、应援与活动纪念。',
    description:
      '围绕“轻便、耐看、易携带”来设计成品形态。可以根据你的使用场景在挂件、摆件、手机支架和亚克力砖之间切换方案。',
    leadTime: '设计确认后 10-14 天发货',
    stock: 24,
    basePrice: 69,
    badges: ['支持挂件/砖/支架', '可选透明边与镭射', '轻礼物向'],
    materials: ['高透亚克力', '彩印覆膜', '可选五金配件'],
    deliverables: ['成品 1 件', '效果确认图', '防磨包装'],
    scenes: ['活动物料', '轻周边', '旅行伴手礼'],
    serviceSteps: ['确认用途与风格', '选择形态与尺寸', '输出裁切与挂点方案', '确认成品后发货'],
    specGroups: [
      {
        id: 'format',
        label: '成品形态',
        helper: '不同形态对应不同的使用场景。',
        options: [
          { id: 'charm', label: '亚克力挂件', description: '适合包挂与钥匙圈', priceDelta: 0 },
          { id: 'brick', label: '亚克力砖', description: '更适合桌面展示与收藏', priceDelta: 42 },
          { id: 'stand', label: '手机支架', description: '兼顾实用与视觉效果', priceDelta: 58 }
        ]
      },
      {
        id: 'size',
        label: '尺寸',
        helper: '越大的尺寸越适合复杂图案。',
        options: [
          { id: 'small', label: '小号', description: '便携，适合简洁构图', priceDelta: 0 },
          { id: 'medium', label: '中号', description: '平衡便携与细节', priceDelta: 18 },
          { id: 'large', label: '大号', description: '适合纪念款与活动款', priceDelta: 34 }
        ]
      },
      {
        id: 'effect',
        label: '特殊工艺',
        helper: '工艺会影响闪耀感与收藏感。',
        options: [
          { id: 'clear', label: '标准透明', description: '最适合日常通用', priceDelta: 0 },
          { id: 'holo', label: '镭射闪膜', description: '在光线下更有层次', priceDelta: 20 },
          { id: 'frost', label: '磨砂边处理', description: '整体观感更柔和高级', priceDelta: 28 }
        ]
      }
    ],
    faqs: [
      {
        question: '挂件五金可以选择颜色吗？',
        answer: '可以，常规提供银色、金色和黑色，若有特殊配件需求可联系客服说明。'
      },
      {
        question: '适合做活动赠品吗？',
        answer: '非常适合，亚克力定制的轻量版本便于批量生产和活动现场派发。'
      },
      {
        question: '是否支持同图不同工艺打样比较？',
        answer: '支持，可先沟通预算，客服会帮助你比对透明、镭射、磨砂等效果差异。'
      }
    ]
  },
  {
    productId: 5103,
    slug: 'picture-book-custom',
    title: '绘本定制',
    subtitle: '将情感片段串成故事，做成一本属于你们自己的小型出版物。',
    summary: '适合纪念故事、节日礼物、成长记录与角色世界观设定集。',
    description:
      '从故事结构、分镜节奏到封面装帧一体化设计。可做成情侣纪念册、亲子成长绘本，也能承接角色设定集与世界观小册。',
    leadTime: '内容策划 3-5 天，制作周期 15-20 天',
    stock: 10,
    basePrice: 399,
    badges: ['支持文字策划', '可做纪念册', '支持精装版本'],
    materials: ['艺术纸', '高质量内页印刷', '可选精装封壳'],
    deliverables: ['封面与内页设计', '成品绘本 1 本', '电子预览版'],
    scenes: ['情侣纪念', '亲子记录', '角色设定集'],
    serviceSteps: ['整理故事素材', '确定分镜节奏', '确认封面与版式', '印刷装订完成寄送'],
    specGroups: [
      {
        id: 'pages',
        label: '页数',
        helper: '页数越多，越适合完整叙事。',
        options: [
          { id: '8p', label: '8 页', description: '适合节日纪念与精简故事', priceDelta: 0 },
          { id: '16p', label: '16 页', description: '适合完整情节与对话推进', priceDelta: 180 },
          { id: '24p', label: '24 页', description: '适合较完整的章节式叙事', priceDelta: 320 }
        ]
      },
      {
        id: 'binding',
        label: '装帧',
        helper: '装帧会显著影响收藏感和礼物感。',
        options: [
          { id: 'soft', label: '平装', description: '轻巧耐翻阅', priceDelta: 0 },
          { id: 'hard', label: '精装', description: '收藏感更强', priceDelta: 96 },
          { id: 'butterfly', label: '蝴蝶精装', description: '适合大跨页与纪念版本', priceDelta: 168 }
        ]
      },
      {
        id: 'print',
        label: '内页风格',
        helper: '根据内容氛围选择更合适的呈现方式。',
        options: [
          { id: 'mono', label: '黑白情绪稿', description: '适合诗意叙事与低饱和氛围', priceDelta: 0 },
          { id: 'color', label: '全彩叙事版', description: '情绪与场景更完整', priceDelta: 220 },
          { id: 'premium', label: '全彩 + 局部工艺封面', description: '礼物属性最强', priceDelta: 320 }
        ]
      }
    ],
    faqs: [
      {
        question: '没有完整文案也能做吗？',
        answer: '可以，我们支持根据聊天记录、照片、时间线和关键词来帮助你整理成可读的故事结构。'
      },
      {
        question: '可以做成角色设定集吗？',
        answer: '可以，人物介绍、世界观关键词、场景章节都能整合进绘本结构。'
      },
      {
        question: '适合作为毕业或纪念礼物吗？',
        answer: '很适合，尤其是需要承载回忆、成长轨迹或想说却来不及说的话时。'
      }
    ]
  },
  {
    productId: 5104,
    slug: 'canvas-art-custom',
    title: '实体画作定制',
    subtitle: '把数字草图落到真实材质上，让作品拥有墙面与空间中的存在感。',
    summary: '适合家居装饰、展陈礼物、收藏级纪念画作。',
    description:
      '可选择艺术微喷、水彩纸原作或油画布输出，并根据你的空间光线、墙面风格和观看距离给出合适画幅建议。',
    leadTime: '画面确认后 10-18 天制作寄出',
    stock: 12,
    basePrice: 299,
    badges: ['可选装裱', '适合家居展示', '支持收藏签名卡'],
    materials: ['艺术微喷纸', '油画布', '水彩纸原作'],
    deliverables: ['实体成品 1 幅', '保护包装', '附带签名卡'],
    scenes: ['新居布置', '纪念收藏', '空间陈列'],
    serviceSteps: ['沟通空间与风格', '确认画幅与材质', '完成输出与装裱', '包装后寄送'],
    specGroups: [
      {
        id: 'size',
        label: '画幅',
        helper: '建议结合放置空间决定画幅。',
        options: [
          { id: 'a4', label: 'A4', description: '适合桌面与小型空间', priceDelta: 0 },
          { id: 'a3', label: 'A3', description: '适合常规墙面陈列', priceDelta: 120 },
          { id: '4060', label: '40 × 60cm', description: '更有空间主视觉效果', priceDelta: 260 }
        ]
      },
      {
        id: 'material',
        label: '材质',
        helper: '材质决定画面的触感与收藏方向。',
        options: [
          { id: 'giclee', label: '艺术微喷', description: '色彩稳定，适合大多数场景', priceDelta: 0 },
          { id: 'watercolor', label: '水彩纸原作', description: '更偏向手作收藏感', priceDelta: 180 },
          { id: 'canvas', label: '油画布输出', description: '适合空间展示与装裱', priceDelta: 220 }
        ]
      },
      {
        id: 'frame',
        label: '装裱',
        helper: '装裱能提升完整度与送礼体验。',
        options: [
          { id: 'none', label: '无装裱', description: '更适合自行处理', priceDelta: 0 },
          { id: 'simple', label: '简约画框', description: '适合现代空间', priceDelta: 96 },
          { id: 'wood', label: '原木画框', description: '更适合温柔和自然风格', priceDelta: 136 }
        ]
      }
    ],
    faqs: [
      {
        question: '可以根据房间风格推荐尺寸吗？',
        answer: '可以，联系客服提供空间照片或尺寸，我们会给出更合适的画幅与配色建议。'
      },
      {
        question: '寄送时会如何保护？',
        answer: '会使用硬壳纸板、角保护和缓冲材料，装框款会追加防震包装。'
      },
      {
        question: '适合送人吗？',
        answer: '非常适合，尤其是有纪念意义的场景画、人物画与空间主题画作。'
      }
    ]
  },
  {
    productId: 5105,
    slug: 'cotton-doll-custom',
    title: '棉花娃娃定制',
    subtitle: '将角色气质与配色转化成柔软的实体形象，适合长期陪伴与收藏。',
    summary: '适合 OC、品牌吉祥物、纪念型角色实体化。',
    description:
      '从五官刺绣、发色布料到服装组合逐步拆解角色元素，做出更适合实体化的棉花娃娃方案。支持基础裸娃与完整服设搭配。',
    leadTime: '方案确认后 20-30 天制作',
    stock: 8,
    basePrice: 699,
    badges: ['支持角色实体化', '可做服装套组', '适合长期收藏'],
    materials: ['短毛绒', '刺绣五官', '可选骨架与换装'],
    deliverables: ['娃体 1 只', '设定确认稿', '基础防尘包装'],
    scenes: ['角色实体化', 'IP 衍生', '收藏陪伴'],
    serviceSteps: ['拆解角色设定', '确认娃体比例与刺绣', '选择服装与配件', '排单打样与寄送'],
    specGroups: [
      {
        id: 'height',
        label: '身高',
        helper: '越高的娃体，服设与五官细节越丰富。',
        options: [
          { id: '10cm', label: '10cm', description: '便携可爱，适合简洁角色', priceDelta: 0 },
          { id: '15cm', label: '15cm', description: '目前最平衡的主流尺寸', priceDelta: 180 },
          { id: '20cm', label: '20cm', description: '更适合重服设与配件', priceDelta: 360 }
        ]
      },
      {
        id: 'package',
        label: '套餐',
        helper: '套餐决定娃体的完成度与可玩性。',
        options: [
          { id: 'nude', label: '裸娃', description: '适合先做角色基础体', priceDelta: 0 },
          { id: 'skeleton', label: '含骨架', description: '方便摆姿势和拍照', priceDelta: 86 },
          { id: 'fullset', label: '含服装套组', description: '更适合礼物和完整收藏', priceDelta: 220 }
        ]
      },
      {
        id: 'embroidery',
        label: '刺绣等级',
        helper: '复杂角色建议提高刺绣等级。',
        options: [
          { id: 'basic', label: '基础刺绣', description: '适合简洁表情', priceDelta: 0 },
          { id: 'detail', label: '细节刺绣', description: '更适合异瞳、泪痣等细节', priceDelta: 120 },
          { id: 'premium', label: '复杂刺绣 + 配色校正', description: '适合高辨识度角色', priceDelta: 220 }
        ]
      }
    ],
    faqs: [
      {
        question: '没有现成角色立绘也能做吗？',
        answer: '可以，只要有关键词、参考图或文字设定，我们可以先帮你拆解出适合娃化的视觉方案。'
      },
      {
        question: '服装可以单独追加吗？',
        answer: '可以，先确认娃体方案后，服装与配件可以分阶段追加。'
      },
      {
        question: '是否支持品牌或吉祥物定制？',
        answer: '支持，如果涉及商业用途，建议先联系客服确认授权与生产范围。'
      }
    ]
  }
];

export function getMarketProducts() {
  return marketProducts;
}

export function getMarketProductBySlug(slug: string) {
  return marketProducts.find((product) => product.slug === slug) ?? null;
}

export function formatMarketPrice(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value);
}

export function getMarketProductMaxPrice(product: MarketProduct) {
  return (
    product.basePrice +
    product.specGroups.reduce((total, group) => {
      const maxDelta = Math.max(...group.options.map((option) => option.priceDelta));
      return total + maxDelta;
    }, 0)
  );
}
