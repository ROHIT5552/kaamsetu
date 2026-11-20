// KAAMSETU & SWABHIMAN - Central Universal Visual Asset Library
// Curated Authentic Indian Workplace Photography across all 10 Core Universal Categories,
// Subcategories, Task Types, Hero Compositions, and Worker Portfolios.

export interface SubcategoryAsset {
  id: string;
  nameEn: string;
  nameMr: string;
  icon: string;
  image: string;
  alt: string;
  sampleOccupations: string[];
}

export interface CategoryAsset {
  id: string;
  nameEn: string;
  nameMr: string;
  badgeEn: string;
  badgeMr: string;
  icon: string;
  heroImage: string;
  thumbnail: string;
  alt: string;
  descriptionEn: string;
  descriptionMr: string;
  subcategories: SubcategoryAsset[];
  visible: boolean;
}

export interface TaskTypeAsset {
  id: string;
  titleEn: string;
  titleMr: string;
  billingEn: string;
  billingMr: string;
  descEn: string;
  descMr: string;
  image: string;
  alt: string;
  icon: string;
  tagEn: string;
  tagMr: string;
}

export interface JobOpportunityAsset {
  id: string;
  titleEn: string;
  titleMr: string;
  categoryId: string;
  hirerName: string;
  hirerType: 'individual' | 'business' | 'contractor';
  hirerLogo?: string;
  locality: string;
  jobType: string;
  jobTypeEn: string;
  jobTypeMr: string;
  payEn: string;
  payMr: string;
  workersNeeded: number;
  postedDateEn: string;
  postedDateMr: string;
  image: string;
  skills: string[];
  descriptionEn: string;
  descriptionMr: string;
}

// 1. HERO VISUAL COMPOSITION (Representing diverse Indian industries as per reference)
export const HERO_VISUAL_ASSETS = {
  skilled: {
    id: "hero-skilled",
    labelEn: "Skilled Trades",
    labelMr: "कुशल कारागीर",
    subEn: "Licensed electricians, plumbers & technicians",
    subMr: "परवानाधारक इलेक्ट्रिशियन, प्लंबर व तंत्रज्ञ",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80",
    alt: "Indian electrician with multimeter and yellow safety helmet inspecting industrial electrical panel"
  },
  agriculture: {
    id: "hero-agriculture",
    labelEn: "Agriculture & Rural",
    labelMr: "शेती व ग्रामीण कामे",
    subEn: "Harvesters, tractor operators & farm hands",
    subMr: "कापणी कामगार, ट्रॅक्टर चालक व शेतमजूर",
    image: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=800&auto=format&fit=crop&q=80",
    alt: "Indian agricultural workers in field harvesting green crops during harvest season"
  },
  professional: {
    id: "hero-professional",
    labelEn: "Professional & Digital",
    labelMr: "व्यावसायिक व डिजिटल",
    subEn: "Developers, accountants & creative pros",
    subMr: "सॉफ्टवेअर डेव्हलपर्स, अकाउंटंट व डिझायनर्स",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80",
    alt: "Young Indian professional at modern office workspace working on laptop with focused expression"
  },
  localServices: {
    id: "hero-local",
    labelEn: "Local Services & Crafts",
    labelMr: "स्थानिक सेवा व हस्तकला",
    subEn: "Carpenters, painters, packers & helpers",
    subMr: "सुतार, पेंटर, शिफ्टिंग व स्थानिक मदतनीस",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80",
    alt: "Indian carpenters working on timber and custom furniture in active workshop"
  }
};

// 2. 10 CORE UNIVERSAL WORK CATEGORIES WITH DEDICATED VISUALS
export const DEFAULT_UNIVERSAL_CATEGORIES: CategoryAsset[] = [
  {
    id: "home-services",
    nameEn: "Home & Personal Services",
    nameMr: "घरगुती आणि वैयक्तिक सेवा",
    badgeEn: "120+ Verified Pros",
    badgeMr: "१२०+ पडताळलेले कामगार",
    icon: "Home",
    heroImage: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=80",
    alt: "Indian home service technician repairing household utilities",
    descriptionEn: "Electricians, plumbers, carpenters, painters, deep cleaning, and appliance repair with upfront visiting fees.",
    descriptionMr: "प्लंबर, इलेक्ट्रिशियन, सुतार, रंगकाम, स्वच्छता आणि उपकरण दुरुस्ती थेट पारदर्शक दरात.",
    visible: true,
    subcategories: [
      {
        id: "electrician",
        nameEn: "Electrician",
        nameMr: "इलेक्ट्रिशियन",
        icon: "Zap",
        image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
        alt: "Electrician troubleshooting residential circuit board and wiring",
        sampleOccupations: ["Wiring repair", "MCB trip fix", "Inverter setup", "Switchboard install"]
      },
      {
        id: "plumber",
        nameEn: "Plumber",
        nameMr: "प्लंबर",
        icon: "Wrench",
        image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80",
        alt: "Plumber repairing PVC pipe and bathroom faucet fittings",
        sampleOccupations: ["Pipe leak fix", "Drain unblocking", "Geyser connection", "Motor pump fitting"]
      },
      {
        id: "carpenter",
        nameEn: "Carpenter",
        nameMr: "सुतार",
        icon: "Hammer",
        image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80",
        alt: "Carpenter making custom wooden furniture and mortise door lock",
        sampleOccupations: ["Door lock fitting", "Modular hinge repair", "Bed frame tightening", "Furniture polish"]
      },
      {
        id: "painter",
        nameEn: "Painter",
        nameMr: "पेंटर",
        icon: "Paintbrush",
        image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80",
        alt: "Painter applying smooth interior wall coating with roller",
        sampleOccupations: ["Wall putty & touchup", "Waterproofing", "Exterior painting", "Wood varnish"]
      },
      {
        id: "cleaner",
        nameEn: "Deep Cleaning & Housekeeping",
        nameMr: "घराची सखोल स्वच्छता",
        icon: "Sparkles",
        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80",
        alt: "Professional house cleaner sanitizing bathroom and tiles",
        sampleOccupations: ["Bathroom deep clean", "Kitchen degreasing", "Sofa vacuuming", "Terrace sweep"]
      },
      {
        id: "ac-technician",
        nameEn: "AC & Refrigeration Technician",
        nameMr: "एसी व फ्रिज तंत्रज्ञ",
        icon: "Wind",
        image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&auto=format&fit=crop&q=80",
        alt: "AC technician servicing split air conditioner outdoor unit",
        sampleOccupations: ["Gas charging", "Filter cleaning", "Cooling coil repair", "Compressor check"]
      },
      {
        id: "gardener",
        nameEn: "Gardener & Landscaper",
        nameMr: "माळी व बागकाम मदतनीस",
        icon: "Sprout",
        image: "https://images.unsplash.com/photo-1592417817098-8f3d69109853?w=600&auto=format&fit=crop&q=80",
        alt: "Gardener trimming potted plants and balcony lawn",
        sampleOccupations: ["Lawn mowing", "Plant repotting", "Pruning & trimming", "Pest spray"]
      },
      {
        id: "appliance-repair",
        nameEn: "Appliance Repair Specialist",
        nameMr: "घरगुती उपकरणे दुरुस्ती",
        icon: "Tv",
        image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80",
        alt: "Technician inspecting washing machine drum and circuit",
        sampleOccupations: ["Washing machine fix", "Microwave oven repair", "RO water purifier", "Geyser coil replace"]
      }
    ]
  },
  {
    id: "construction",
    nameEn: "Construction & Industrial",
    nameMr: "बांधकाम आणि औद्योगिक कामे",
    badgeEn: "95+ Verified Pros",
    badgeMr: "९५+ पडताळलेले कामगार",
    icon: "HardHat",
    heroImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&auto=format&fit=crop&q=80",
    alt: "Indian construction site workers in helmets and reflective vests on commercial building site",
    descriptionEn: "Masons, welders, fabricators, tile workers, machine operators, and site supervisors for sites and industrial units.",
    descriptionMr: "गवंडी, वेल्डर, फॅब्रिकेटर, फरशी कामगार, क्रेन चालक व पर्यवेक्षक बांधकाम प्रकल्पांसाठी.",
    visible: true,
    subcategories: [
      {
        id: "mason",
        nameEn: "Mason (गवंडी)",
        nameMr: "गवंडी कामगार",
        icon: "Hammer",
        image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80",
        alt: "Mason laying red brick wall with trowel and level line",
        sampleOccupations: ["Brick masonry", "Wall plastering", "Foundation stone work", "Slab casting support"]
      },
      {
        id: "welder",
        nameEn: "Welder & Metal Fabricator",
        nameMr: "वेल्डर व फॅब्रिकेटर",
        icon: "Flame",
        image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
        alt: "Welder in safety visor welding steel framework with brilliant sparks",
        sampleOccupations: ["Arc welding", "Safety grill fabrication", "Channel gate install", "Shed framing"]
      },
      {
        id: "tile-worker",
        nameEn: "Tile & Marble Layer",
        nameMr: "फरशी व मार्बल कारागीर",
        icon: "Grid",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80",
        alt: "Craftsman laying vitrified porcelain tiles on floor",
        sampleOccupations: ["Floor tiling", "Kitchen granite counter", "Bathroom dado tiles", "Epoxy grouting"]
      },
      {
        id: "site-helper",
        nameEn: "Construction Labourer & Helper",
        nameMr: "बांधकाम मजूर व मदतनीस",
        icon: "Users",
        image: "https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?w=600&auto=format&fit=crop&q=80",
        alt: "Construction labourers transporting materials on construction floor",
        sampleOccupations: ["Sand/gravel mixing", "Bricks loading", "Debris clearing", "Curing & watering"]
      },
      {
        id: "machine-operator",
        nameEn: "Machine & Crane Operator",
        nameMr: "यंत्र व क्रेन चालक",
        icon: "Truck",
        image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80",
        alt: "Heavy machinery operator at Waluj industrial estate",
        sampleOccupations: ["JCB excavator", "Concrete mixer driver", "Forklift handling", "Drill rig operator"]
      },
      {
        id: "site-supervisor",
        nameEn: "Site Supervisor & Quality Checker",
        nameMr: "साइट सुपरवायझर",
        icon: "ClipboardCheck",
        image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
        alt: "Civil engineer inspecting site blueprint and structural column",
        sampleOccupations: ["Material inspection", "Labour attendance", "Drawing alignment", "Daily progress log"]
      }
    ]
  },
  {
    id: "hospitality",
    nameEn: "Hospitality & Events",
    nameMr: "हॉस्पिटॅलिटी आणि इव्हेंट्स",
    badgeEn: "80+ Verified Pros",
    badgeMr: "८०+ पडताळलेले कामगार",
    icon: "Utensils",
    heroImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80",
    alt: "Indian chef cooking authentic cuisine in commercial restaurant kitchen",
    descriptionEn: "Cooks, banquet waitstaff, kitchen helpers, wedding decorators, photographers, and event coordinators.",
    descriptionMr: "महाराज, आचारी, वेटर, किचन मदतनीस, लग्न सजावटकार, फोटोग्राफर व कार्यक्रम व्यवस्थापक.",
    visible: true,
    subcategories: [
      {
        id: "cook",
        nameEn: "Cook & Maharaj (आचारी)",
        nameMr: "आचारी व स्वयंपाकी",
        icon: "Coffee",
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
        alt: "Chef preparing traditional Indian festive meal in large pan",
        sampleOccupations: ["Maharashtrian banquet", "North/South Indian", "Tandoori chef", "Daily home cook"]
      },
      {
        id: "waiter",
        nameEn: "Banquet Waiter & Service Staff",
        nameMr: "वेटर व सर्व्हिस स्टाफ",
        icon: "Users",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80",
        alt: "Dressed banquet waiter serving guests at corporate dinner reception",
        sampleOccupations: ["Buffet handling", "Table service", "Drink/water runner", "VIP dining staff"]
      },
      {
        id: "kitchen-helper",
        nameEn: "Kitchen Helper & Dishwasher",
        nameMr: "किचन मदतनीस व स्वच्छता",
        icon: "Sparkles",
        image: "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=600&auto=format&fit=crop&q=80",
        alt: "Kitchen helper preparing fresh vegetables and mise en place",
        sampleOccupations: ["Vegetable chopping", "Deep vessel washing", "Kitchen sanitization", "Counter prep"]
      },
      {
        id: "decorator",
        nameEn: "Event & Wedding Decorator",
        nameMr: "मंडप व लग्न सजावटकार",
        icon: "Palette",
        image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80",
        alt: "Decorators arranging floral backdrop and warm fairy lights for wedding ceremony",
        sampleOccupations: ["Floral stage setup", "Mandap drapery", "Balloon styling", "LED ambient lighting"]
      },
      {
        id: "photographer",
        nameEn: "Event Photographer & Videographer",
        nameMr: "फोटोग्राफर व सिनेमॅटोग्राफर",
        icon: "Camera",
        image: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&auto=format&fit=crop&q=80",
        alt: "Photographer framing cultural ceremony with mirrorless camera and prime lens",
        sampleOccupations: ["Candid photography", "Traditional video shoot", "Drone coverage", "Same-day teaser edit"]
      }
    ]
  },
  {
    id: "transport",
    nameEn: "Transport & Logistics",
    nameMr: "वाहतूक आणि लॉजिस्टिक्स",
    badgeEn: "110+ Verified Pros",
    badgeMr: "११०+ पडताळलेले कामगार",
    icon: "Truck",
    heroImage: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=80",
    alt: "Warehouse logistics staff managing parcel dispatch and delivery fleet",
    descriptionEn: "Commercial drivers, delivery riders, warehouse workers, heavy loaders, packers, and moving crew.",
    descriptionMr: "चालक, डिलिव्हरी बॉईज, गोदामातील कर्मचारी, माल लोडर, पॅकर्स व टेम्पो मदतनीस.",
    visible: true,
    subcategories: [
      {
        id: "driver",
        nameEn: "Commercial & Private Driver",
        nameMr: "खाजगी व व्यावसायिक ड्रायव्हर",
        icon: "Car",
        image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&auto=format&fit=crop&q=80",
        alt: "Professional driver at steering wheel on highway trip",
        sampleOccupations: ["City car driver", "Outstation trips", "Tempo / Bolero Maxi", "Night duty driver"]
      },
      {
        id: "delivery-rider",
        nameEn: "Delivery Partner & Courier",
        nameMr: "डिलिव्हरी पार्टनर व कुरिअर",
        icon: "Bike",
        image: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=600&auto=format&fit=crop&q=80",
        alt: "Delivery courier rider in safety helmet delivering package to customer door",
        sampleOccupations: ["Food delivery", "E-commerce parcels", "Pharmacy medicine drop", "Document dispatch"]
      },
      {
        id: "warehouse-loader",
        nameEn: "Warehouse Loader & Packer",
        nameMr: "गोदाम लोडर व पॅकर",
        icon: "Package",
        image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80",
        alt: "Logistics staff loading cardboard crates inside transport van",
        sampleOccupations: ["Truck unloading", "Bubble wrap packing", "Inventory tagging", "Heavy box shifting"]
      },
      {
        id: "forklift-operator",
        nameEn: "Forklift & Heavy Vehicle Operator",
        nameMr: "फोर्कलिफ्ट चालक",
        icon: "ShieldAlert",
        image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80",
        alt: "Forklift driver moving high pallet rack in logistics hub",
        sampleOccupations: ["Industrial pallet stack", "Container de-stuffing", "MIDC yard transport"]
      }
    ]
  },
  {
    id: "agriculture",
    nameEn: "Agriculture & Rural Work",
    nameMr: "शेती आणि ग्रामीण कामे",
    badgeEn: "135+ Verified Pros",
    badgeMr: "१३५+ पडताळलेले कामगार",
    icon: "Sprout",
    heroImage: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=300&auto=format&fit=crop&q=80",
    alt: "Indian women farmers harvesting lush green crops in fertile farmland",
    descriptionEn: "Farm labourers, harvesting teams, tractor drivers, drip irrigation technicians, and livestock caretakers.",
    descriptionMr: "शेतमजूर, कापणी टोळी, ट्रॅक्टर चालक, ठिबक सिंचन तंत्रज्ञ व पशुधन काळजीवाहू.",
    visible: true,
    subcategories: [
      {
        id: "farm-labourer",
        nameEn: "Agricultural Labourer (शेतमजूर)",
        nameMr: "शेतमजूर",
        icon: "Users",
        image: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=600&auto=format&fit=crop&q=80",
        alt: "Agricultural workers weeding crop rows under morning sunlight",
        sampleOccupations: ["Weeding & sowing", "Cotton picking", "Sugarcane cutting", "Vegetable plucking"]
      },
      {
        id: "tractor-operator",
        nameEn: "Tractor & Rotavator Driver",
        nameMr: "ट्रॅक्टर व रोटाव्हेटर चालक",
        icon: "Truck",
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
        alt: "Tractor plowing field soil in preparation for sowing season",
        sampleOccupations: ["Ploughing & harrowing", "Trolley haulage", "Laser land leveling", "Sprayer attachment"]
      },
      {
        id: "irrigation-tech",
        nameEn: "Drip & Sprinkler Irrigation Tech",
        nameMr: "ठिबक व तुषार सिंचन तंत्रज्ञ",
        icon: "Droplets",
        image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&auto=format&fit=crop&q=80",
        alt: "Irrigation technician checking lateral pipe emitters and valves",
        sampleOccupations: ["Lateral leak repair", "Venturi fertilizer inject", "Submersible pump connect", "Filter clean"]
      },
      {
        id: "livestock-caretaker",
        nameEn: "Livestock & Dairy Caretaker",
        nameMr: "गोठा व पशुधन काळजीवाहू",
        icon: "HeartHandshake",
        image: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=600&auto=format&fit=crop&q=80",
        alt: "Dairy farm worker caring for milch cows at rural farm shed",
        sampleOccupations: ["Milking assistance", "Fodder cutting (कडबा कुट्टी)", "Cattle shed cleaning", "Veterinary escort"]
      }
    ]
  },
  {
    id: "office-admin",
    nameEn: "Office & Administration",
    nameMr: "कार्यालय आणि प्रशासन",
    badgeEn: "70+ Verified Pros",
    badgeMr: "७०+ पडताळलेले कामगार",
    icon: "Briefcase",
    heroImage: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300&auto=format&fit=crop&q=80",
    alt: "Modern office workspace with administrative staff reviewing financial documents",
    descriptionEn: "Data entry operators, receptionists, Tally accountants, office peons, HR coordinators, and telecallers.",
    descriptionMr: "डेटा एंट्री ऑपरेटर, रिसेप्शनिस्ट, टॅली अकाउंटंट, ऑफिस बॉय, एचआर मदतनीस व टेलिकॉलर.",
    visible: true,
    subcategories: [
      {
        id: "data-entry",
        nameEn: "Data Entry & Computer Operator",
        nameMr: "डेटा एंट्री व संगणक ऑपरेटर",
        icon: "FileSpreadsheet",
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80",
        alt: "Operator inputting records into Excel spreadsheet on desktop PC",
        sampleOccupations: ["Excel data entry", "Marathi/English typing", "Document scanning", "GST billing entry"]
      },
      {
        id: "accountant",
        nameEn: "Tally & GST Accountant",
        nameMr: "टॅली व जीएसटी अकाउंटंट",
        icon: "Calculator",
        image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80",
        alt: "Accountant balancing monthly ledger and tax receipts with calculator",
        sampleOccupations: ["Tally Prime entries", "GST return prep", "Bank reconciliation", "Vendor ledger tally"]
      },
      {
        id: "receptionist",
        nameEn: "Front Desk & Receptionist",
        nameMr: "रिसेप्शनिस्ट व फ्रंट डेस्क",
        icon: "PhoneCall",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
        alt: "Front desk executive welcoming office visitor with pleasant gesture",
        sampleOccupations: ["Visitor logbook", "Call handling", "Appointment scheduling", "Mail & parcel receiving"]
      },
      {
        id: "office-assistant",
        nameEn: "Office Assistant & Peon",
        nameMr: "ऑफिस असिस्टंट व शिपाई",
        icon: "Coffee",
        image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80",
        alt: "Office assistant organizing file folders and office supplies",
        sampleOccupations: ["Filing & paperwork", "Bank deposit errands", "Tea/water service", "Meeting room prep"]
      }
    ]
  },
  {
    id: "digital-it",
    nameEn: "Digital & IT Services",
    nameMr: "डिजिटल आणि आयटी सेवा",
    badgeEn: "65+ Verified Pros",
    badgeMr: "६५+ पडताळलेले कामगार",
    icon: "Laptop",
    heroImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&auto=format&fit=crop&q=80",
    alt: "Indian software developer programming modern web application on laptop",
    descriptionEn: "Frontend/backend developers, graphic designers, UI/UX designers, video editors, digital marketers, and QA testers.",
    descriptionMr: "वेबसाइट डेव्हलपर्स, ग्राफिक डिझायनर्स, व्हिडिओ एडिटर्स, सोशल मीडिया मार्केटर व सॉफ्टवेअर टेस्टर्स.",
    visible: true,
    subcategories: [
      {
        id: "web-developer",
        nameEn: "Frontend & Fullstack Developer",
        nameMr: "वेब व सॉफ्टवेअर डेव्हलपर",
        icon: "Code",
        image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80",
        alt: "Developer writing clean React/Next.js code in dark mode editor",
        sampleOccupations: ["Next.js websites", "E-commerce stores", "API integration", "Bug fixing"]
      },
      {
        id: "graphic-designer",
        nameEn: "Graphic Designer & Branding",
        nameMr: "ग्राफिक डिझायनर",
        icon: "Palette",
        image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80",
        alt: "Designer creating brand identity logo and social media banner on tablet",
        sampleOccupations: ["Logo design", "Social media creatives", "Product packaging", "Brochures & flyers"]
      },
      {
        id: "video-editor",
        nameEn: "Video Editor & Reels Creator",
        nameMr: "व्हिडिओ एडिटर",
        icon: "Video",
        image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80",
        alt: "Video editor assembling YouTube clips and transitions on timeline",
        sampleOccupations: ["Instagram Reels", "YouTube 4K editing", "Color grading", "Motion graphics"]
      },
      {
        id: "digital-marketing",
        nameEn: "Digital Marketer & SEO Specialist",
        nameMr: "डिजिटल मार्केटर व एसइओ",
        icon: "TrendingUp",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
        alt: "Marketing specialist reviewing Google Ads campaign analytics and graph curves",
        sampleOccupations: ["Meta/Google Ads", "Google Maps local SEO", "WhatsApp campaigns", "Content writing"]
      }
    ]
  },
  {
    id: "education",
    nameEn: "Education & Training",
    nameMr: "शिक्षण आणि प्रशिक्षण",
    badgeEn: "55+ Verified Pros",
    badgeMr: "५५+ पडताळलेले कामगार",
    icon: "GraduationCap",
    heroImage: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=300&auto=format&fit=crop&q=80",
    alt: "Tutor teaching high school mathematics to student with notebook and geometry kit",
    descriptionEn: "Home tutors, school teachers, computer trainers, music & dance coaches, and personal fitness trainers.",
    descriptionMr: "होम ट्यूटर, शाळा शिक्षक, संगणक प्रशिक्षक, संगीत शिक्षक व वैयक्तिक फिटनेस ट्रेनर.",
    visible: true,
    subcategories: [
      {
        id: "home-tutor",
        nameEn: "Home Tutor (CBSE / State Board)",
        nameMr: "होम ट्यूटर (पहिली ते दहावी)",
        icon: "BookOpen",
        image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80",
        alt: "Teacher assisting young student with homework in study room",
        sampleOccupations: ["Maths & Science (1-10)", "English speaking", "Board exam prep", "Daily homework assist"]
      },
      {
        id: "computer-trainer",
        nameEn: "Computer & Coding Trainer",
        nameMr: "संगणक व कोडिंग प्रशिक्षक",
        icon: "Cpu",
        image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80",
        alt: "Instructor demonstrating Python code to students in modern computer lab",
        sampleOccupations: ["Basic MS Office", "Python / Web coding", "Kids scratch coding", "Typing speed coaching"]
      },
      {
        id: "music-trainer",
        nameEn: "Music, Vocal & Dance Teacher",
        nameMr: "संगीत, गायन व नृत्य शिक्षक",
        icon: "Music",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
        alt: "Music teacher holding acoustic guitar and teaching chords",
        sampleOccupations: ["Harmonium & vocals", "Acoustic guitar", "Kathak / classical dance", "Tabla beats"]
      },
      {
        id: "fitness-trainer",
        nameEn: "Personal Yoga & Fitness Coach",
        nameMr: "योगा व फिटनेस प्रशिक्षक",
        icon: "Heart",
        image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80",
        alt: "Yoga instructor demonstrating stretching asana on exercise mat",
        sampleOccupations: ["Morning yoga", "Weight loss guidance", "Senior mobility drills", "Home gym workout"]
      }
    ]
  },
  {
    id: "care-personal",
    nameEn: "Care & Personal Assistance",
    nameMr: "काळजी आणि वैयक्तिक मदत",
    badgeEn: "50+ Verified Pros",
    badgeMr: "५०+ पडताळलेले कामगार",
    icon: "HeartHandshake",
    heroImage: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=300&auto=format&fit=crop&q=80",
    alt: "Compassionate female caregiver assisting an elderly Indian grandmother in living room",
    descriptionEn: "Babysitters, verified elderly care attendants, patient companions, household assistants, and pet sitters.",
    descriptionMr: "बालसंगोपन मदतनीस, ज्येष्ठ नागरिक काळजीवाहू, रुग्ण साहाय्यक व घरकाम मदतनीस.",
    visible: true,
    subcategories: [
      {
        id: "elderly-care",
        nameEn: "Elderly Care & Companion",
        nameMr: "ज्येष्ठ नागरिक काळजीवाहू",
        icon: "Heart",
        image: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&auto=format&fit=crop&q=80",
        alt: "Care attendant taking pulse and offering medicine glass to senior citizen",
        sampleOccupations: ["Medicine reminder", "Walking companion", "Doctor clinic escort", "BP/Sugar monitoring"]
      },
      {
        id: "babysitter",
        nameEn: "Babysitter & Child Caretaker",
        nameMr: "बालसंगोपन मदतनीस (आया)",
        icon: "Smile",
        image: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=600&auto=format&fit=crop&q=80",
        alt: "Babysitter interacting with toddler with building blocks",
        sampleOccupations: ["After-school care", "Toddler feeding", "Story reading & play", "School pickup escort"]
      },
      {
        id: "patient-attendant",
        nameEn: "Home Patient Attendant (GDA)",
        nameMr: "रुग्ण मदतनीस (जीडीए)",
        icon: "ShieldAlert",
        image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80",
        alt: "Trained healthcare assistant adjusting patient bedside equipment",
        sampleOccupations: ["Bedside hygiene", "Mobility transfer", "Wound dressing support", "Oxygen monitoring"]
      },
      {
        id: "pet-caretaker",
        nameEn: "Pet Walker & Caretaker",
        nameMr: "पाळीव प्राणी काळजीवाहू",
        icon: "Smile",
        image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format&fit=crop&q=80",
        alt: "Pet care helper walking friendly dog in neighborhood park",
        sampleOccupations: ["Daily dog walking", "Pet feeding while away", "Basic pet grooming", "Vet clinic transit"]
      }
    ]
  },
  {
    id: "retail-sales",
    nameEn: "Retail & Sales",
    nameMr: "किरकोळ विक्री आणि सेल्स",
    badgeEn: "85+ Verified Pros",
    badgeMr: "८५+ पडताळलेले कामगार",
    icon: "ShoppingBag",
    heroImage: "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=800&auto=format&fit=crop&q=80",
    thumbnail: "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=300&auto=format&fit=crop&q=80",
    alt: "Retail shop assistant checking inventory on store shelf with customer at counter",
    descriptionEn: "Shop assistants, billing cashiers, counter sales executives, store merchandisers, and field promotional staff.",
    descriptionMr: "दुकान मदतनीस, बिलिंग कॅशियर, सेल्समन, स्टॉक असिस्टंट व फिल्ड सेल्स प्रतिनिधी.",
    visible: true,
    subcategories: [
      {
        id: "shop-assistant",
        nameEn: "Shop Assistant & Counter Sales",
        nameMr: "दुकान मदतनीस व सेल्समन",
        icon: "Tag",
        image: "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=600&auto=format&fit=crop&q=80",
        alt: "Shop salesperson explaining garment fabric to shopper in apparel boutique",
        sampleOccupations: ["Customer greeting", "Showroom display", "Stock packing", "Price tag labeling"]
      },
      {
        id: "cashier",
        nameEn: "Billing Cashier & POS Operator",
        nameMr: "बिलिंग कॅशियर व पीओएस ऑपरेटर",
        icon: "CreditCard",
        image: "https://images.unsplash.com/photo-1556742049-0a67e557224f?w=600&auto=format&fit=crop&q=80",
        alt: "Cashier operating barcode scanner and billing POS machine",
        sampleOccupations: ["Barcode scanning", "UPI & cash handling", "Day-end cash tally", "GST invoice print"]
      },
      {
        id: "merchandiser",
        nameEn: "Store Merchandiser & Stock Keeper",
        nameMr: "स्टॉक कीपर व मांडणी कर्मचारी",
        icon: "Layers",
        image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80",
        alt: "Stock assistant organizing retail FMCG products neatly on supermarket shelves",
        sampleOccupations: ["Shelf restocking", "Expiry date audits", "Stock count check", "Promotional display"]
      },
      {
        id: "field-sales",
        nameEn: "Field Sales Representative",
        nameMr: "फिल्ड सेल्स प्रतिनिधी",
        icon: "Navigation",
        image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80",
        alt: "Sales executive on business road trip meeting shop owners with sample catalog",
        sampleOccupations: ["Shop-to-shop visits", "Order booking", "Product sampling", "Payment collection"]
      }
    ]
  }
];

// 3. 9 UNIVERSAL TASK TYPES WITH DISTINCT VISUAL IDENTITIES
export const DEFAULT_TASK_TYPES: TaskTypeAsset[] = [
  {
    id: "quick-task",
    titleEn: "Quick Task",
    titleMr: "तातडीचे लहान काम",
    billingEn: "Fixed price / Visit",
    billingMr: "निश्चित दर / व्हिजिट",
    descEn: "Single fixes like tap leakage, fan repair, or lock adjustment done in 30-60 mins.",
    descMr: "नळ गळती, फॅन बिघाड किंवा कुलूप बसवणे यासारखी ३०-६० मिनिटांची कामे.",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    alt: "Quick electrical and mechanical repairs",
    icon: "Zap",
    tagEn: "Under 1 Hour",
    tagMr: "१ तासाच्या आत"
  },
  {
    id: "hourly-work",
    titleEn: "Hourly Work",
    titleMr: "तासिका तत्त्वावर काम",
    billingEn: "Fair rate per hour",
    billingMr: "पारदर्शक दर प्रति तास",
    descEn: "Transparent billing by the clock for deep cleaning, helper assistance, or multi-item fixes.",
    descMr: "स्वच्छता, घरात सामान उचलणे किंवा दुरुस्तीसाठी अचूक तासानुसार बिलिंग.",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80",
    alt: "Hourly deep cleaning and utility assistance",
    icon: "Clock",
    tagEn: "Flexible Hours",
    tagMr: "लवचिक वेळ"
  },
  {
    id: "daily-wage",
    titleEn: "Daily Wage Work",
    titleMr: "रोजंदारी काम",
    billingEn: "Per day wage (8 hrs)",
    billingMr: "दररोज वेतन (८ तास)",
    descEn: "Standard 8-hour shift for construction helpers, event staff, loading crews, or farm hands.",
    descMr: "बांधकाम मजूर, कार्यक्रम मदतनीस, लोडिंग किंवा शेतमजुरांसाठी संपूर्ण ८ तासांची रोजंदारी.",
    image: "https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?w=600&auto=format&fit=crop&q=80",
    alt: "Daily wage construction and loading workers",
    icon: "Calendar",
    tagEn: "Full Day Shift",
    tagMr: "संपूर्ण दिवस"
  },
  {
    id: "shift-work",
    titleEn: "Shift Work",
    titleMr: "पाळीनुसार काम (शिफ्ट)",
    billingEn: "Per shift rate",
    billingMr: "प्रति शिफ्ट मानधन",
    descEn: "Defined morning, evening, or night shifts for restaurant waiters, cooks, or security attendants.",
    descMr: "हॉटेल वेटर, आचारी किंवा सुरक्षारक्षकांसाठी सकाळ/रात्र अशा ठरलेल्या शिफ्ट्स.",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80",
    alt: "Hospitality and banquet shift workers",
    icon: "Repeat",
    tagEn: "Morning / Night",
    tagMr: "सकाळ / रात्र"
  },
  {
    id: "project-work",
    titleEn: "Project-Based Work",
    titleMr: "प्रकल्पनिहाय काम",
    billingEn: "Milestone-based",
    billingMr: "टप्प्याटप्प्याने मोबदला",
    descEn: "Agreed scope and milestone payments for full flat painting, modular kitchen, or web development.",
    descMr: "संपूर्ण घराचे रंगकाम, मॉड्युलर फर्निचर किंवा सॉफ्टवेअर प्रकल्पांसाठी टप्प्यानिहाय करार.",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80",
    alt: "Project based carpentry and turnkey work",
    icon: "CheckSquare",
    tagEn: "Scope & Milestones",
    tagMr: "ठरलेला करार"
  },
  {
    id: "contract-work",
    titleEn: "Contract Work",
    titleMr: "कंत्राटी काम (महिना / त्रैमासिक)",
    billingEn: "Fixed contract sum",
    billingMr: "निश्चित करार रक्कम",
    descEn: "1-6 month engagements for office data entry, dedicated tempo drivers, or agricultural harvest.",
    descMr: "१ ते ६ महिन्यांसाठी कार्यालयीन डेटा ऑपरेटर, समर्पित चालक किंवा हंगामी शेती काम.",
    image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&auto=format&fit=crop&q=80",
    alt: "Office administrative contract work",
    icon: "FileText",
    tagEn: "1 - 6 Months",
    tagMr: "१ - ६ महिने"
  },
  {
    id: "permanent",
    titleEn: "Permanent Employment",
    titleMr: "कायमस्वरूपी नोकरी",
    billingEn: "Monthly salary",
    billingMr: "मासिक वेतन",
    descEn: "Verified full-time hiring for retail cashiers, workshop fabricators, technicians, and office staff.",
    descMr: "दुकानातील कॅशियर, फॅब्रिकेटर, तंत्रज्ञ व ऑफिस स्टाफसाठी थेट पडताळलेली नोकरी.",
    image: "https://images.unsplash.com/photo-1556742049-0a67e557224f?w=600&auto=format&fit=crop&q=80",
    alt: "Permanent verified retail and office staff",
    icon: "UserCheck",
    tagEn: "Full-Time Staff",
    tagMr: "कायम नोकरी"
  },
  {
    id: "recurring-work",
    titleEn: "Recurring Work",
    titleMr: "नियमित आवर्ती काम",
    billingEn: "Per visit / Monthly pass",
    billingMr: "प्रति फेरी / मासिक पास",
    descEn: "Repeat scheduled service for weekly garden grooming, alternate-day cleaning, or elder companion.",
    descMr: "आठवड्यातून एकदा बागकाम, घरकाम स्वच्छता किंवा ज्येष्ठांची नियमित काळजी.",
    image: "https://images.unsplash.com/photo-1592417817098-8f3d69109853?w=600&auto=format&fit=crop&q=80",
    alt: "Recurring gardening and elder care routine",
    icon: "CalendarDays",
    tagEn: "Weekly / Monthly",
    tagMr: "नियमित फेरी"
  },
  {
    id: "emergency-work",
    titleEn: "Emergency 15-Min",
    titleMr: "तातडीची १५ मिनिटांत सेवा",
    billingEn: "Upfront + Night surge",
    billingMr: "पारदर्शक + रात्र दर",
    descEn: "Rapid response priority dispatch for midnight pipe bursts, main circuit trips, or water overflows.",
    descMr: "मध्यरात्री पाईप फुटणे, वीज जाणे किंवा कुलूप अडकणे यावर १५ मिनिटांत जलद मदत.",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
    alt: "Emergency rapid response technician",
    icon: "AlertTriangle",
    tagEn: "24x7 Priority",
    tagMr: "२४/७ तातडी"
  }
];

// 4. REALISTIC FEATURED LOCAL JOBS IN CHHATRAPATI SAMBHAJINAGAR
export const FEATURED_LOCAL_JOBS: JobOpportunityAsset[] = [
  {
    id: "job-101",
    titleEn: "Emergency Pipeline & Valve Replacement",
    titleMr: "तातडीची पाईपलाईन व व्हॉल्व्ह दुरुस्ती",
    categoryId: "home-services",
    hirerName: "Omkar Residency Society",
    hirerType: "business",
    locality: "Garkheda",
    jobType: "quick-task",
    jobTypeEn: "Quick Task",
    jobTypeMr: "तातडीचे काम",
    payEn: "₹650 Fixed + Parts",
    payMr: "₹६५० निश्चित + साहित्य",
    workersNeeded: 1,
    postedDateEn: "15 mins ago",
    postedDateMr: "१५ मिनिटांपूर्वी",
    image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80",
    skills: ["Plumbing", "PVC Jointing", "Angle Cock"],
    descriptionEn: "Overhead 2000L tank outlet valve leaking into corridor. Require experienced plumber immediately.",
    descriptionMr: "वरच्या पाण्याच्या टाकीचा मेन व्हॉल्व्ह गळत असून तातडीने अनुभवी प्लंबर हवा आहे."
  },
  {
    id: "job-102",
    titleEn: "Warehouse Loading & Carton Packing",
    titleMr: "गोदामात माल लोडिंग व खोके पॅकिंग",
    categoryId: "transport",
    hirerName: "Marathwada Agro Logistics",
    hirerType: "business",
    locality: "Waluj",
    jobType: "daily-wage",
    jobTypeEn: "Daily Wage",
    jobTypeMr: "रोजंदारी",
    payEn: "₹550 / Day + Tea",
    payMr: "₹५५० / दिवस + चहा",
    workersNeeded: 4,
    postedDateEn: "1 hour ago",
    postedDateMr: "१ तासापूर्वी",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80",
    skills: ["Loading", "Material Handling", "Packing"],
    descriptionEn: "Unloading packaged agricultural seeds from two container trucks into depot shelves.",
    descriptionMr: "दोन कंटेनर ट्रकमधून बियाण्यांची पोती गोदामात सुस्थितीत रचून ठेवण्यासाठी ४ मदतनीस हवेत."
  },
  {
    id: "job-103",
    titleEn: "Commercial Showroom 3-Phase Rewiring",
    titleMr: "शोरूममध्ये ३-फेज वायरिंग व एमसीबी बसवणे",
    categoryId: "home-services",
    hirerName: "Kalyan Electronics",
    hirerType: "business",
    locality: "Jalna Road",
    jobType: "project-work",
    jobTypeEn: "Project",
    jobTypeMr: "प्रकल्प",
    payEn: "₹4,200 Contract",
    payMr: "₹४,२०० करार",
    workersNeeded: 2,
    postedDateEn: "Today",
    postedDateMr: "आज",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
    skills: ["3-Phase Wiring", "Havells MCB", "LED Concealed"],
    descriptionEn: "Upgrading retail ground floor lighting lines and installing 63A changeover breaker panel.",
    descriptionMr: "दुकानातील जुनी वायरिंग बदलून नवीन ३-फेज सुरक्षित पॅनेल व एलईडी फिटिंग करायचे आहे."
  },
  {
    id: "job-104",
    titleEn: "Sugarcane Harvesting & Field Stacking",
    titleMr: "ऊस तोडणी व शेतातून ट्रॅक्टर ट्रॉलीत भरणे",
    categoryId: "agriculture",
    hirerName: "Jadhav Farms",
    hirerType: "individual",
    locality: "Harsul",
    jobType: "daily-wage",
    jobTypeEn: "Daily Wage",
    jobTypeMr: "रोजंदारी",
    payEn: "₹600 / Day + Lunch",
    payMr: "₹६०० / दिवस + जेवण",
    workersNeeded: 6,
    postedDateEn: "Today",
    postedDateMr: "आज",
    image: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=600&auto=format&fit=crop&q=80",
    skills: ["Crop Cutting", "Bundling", "Loading"],
    descriptionEn: "Harvesting ripe sugarcane plot and loading into sugar factory delivery trolley.",
    descriptionMr: "ऊस तोडणी करून ट्रॉलीत रचण्यासाठी तातडीने कुशल व कष्टाळू मजूर हवेत."
  },
  {
    id: "job-105",
    titleEn: "Retail Counter Billing & Cash Management",
    titleMr: "सुपरमार्केट बिलिंग व कॉम्प्युटर ऑपरेटर",
    categoryId: "retail-sales",
    hirerName: "Aura Fresh Mart",
    hirerType: "business",
    locality: "CIDCO N-3",
    jobType: "permanent",
    jobTypeEn: "Permanent",
    jobTypeMr: "कायम नोकरी",
    payEn: "₹14,500 / Month",
    payMr: "₹१४,५०० / महिना",
    workersNeeded: 2,
    postedDateEn: "Yesterday",
    postedDateMr: "काल",
    image: "https://images.unsplash.com/photo-1556742049-0a67e557224f?w=600&auto=format&fit=crop&q=80",
    skills: ["POS Billing", "Barcode", "Cashier"],
    descriptionEn: "Full-time cashier for evening shift (2 PM - 10 PM) with basic computer knowledge.",
    descriptionMr: "संध्याकाळच्या शिफ्टसाठी संगणक व बारकोड बिलिंगची माहिती असणारा जबाबदार कॅशियर हवा."
  }
];

// 5. LOCAL STORAGE SYNC & DYNAMIC ADMIN OVERRIDES
const STORAGE_KEY = "kaamsetu_visual_catalog_overrides_v1";

export function getVisualCatalog(): {
  categories: CategoryAsset[];
  taskTypes: TaskTypeAsset[];
  hero: typeof HERO_VISUAL_ASSETS;
} {
  if (typeof window === "undefined") {
    return {
      categories: DEFAULT_UNIVERSAL_CATEGORIES,
      taskTypes: DEFAULT_TASK_TYPES,
      hero: HERO_VISUAL_ASSETS
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        categories: DEFAULT_UNIVERSAL_CATEGORIES,
        taskTypes: DEFAULT_TASK_TYPES,
        hero: HERO_VISUAL_ASSETS
      };
    }
    const parsed = JSON.parse(raw);
    return {
      categories: parsed.categories || DEFAULT_UNIVERSAL_CATEGORIES,
      taskTypes: parsed.taskTypes || DEFAULT_TASK_TYPES,
      hero: parsed.hero || HERO_VISUAL_ASSETS
    };
  } catch (err) {
    console.error("Error reading visual catalog overrides:", err);
    return {
      categories: DEFAULT_UNIVERSAL_CATEGORIES,
      taskTypes: DEFAULT_TASK_TYPES,
      hero: HERO_VISUAL_ASSETS
    };
  }
}

export function saveVisualCatalog(catalog: {
  categories: CategoryAsset[];
  taskTypes: TaskTypeAsset[];
  hero?: typeof HERO_VISUAL_ASSETS;
}): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
    // Dispatch custom event for cross-component reactive updates
    window.dispatchEvent(new CustomEvent("kaamsetu:catalog-updated", { detail: catalog }));
  } catch (err) {
    console.error("Failed to persist visual catalog overrides:", err);
  }
}

export function resetVisualCatalogToDefaults(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("kaamsetu:catalog-updated", {
        detail: {
          categories: DEFAULT_UNIVERSAL_CATEGORIES,
          taskTypes: DEFAULT_TASK_TYPES,
          hero: HERO_VISUAL_ASSETS
        }
      })
    );
  } catch (err) {
    console.error("Failed to reset visual catalog:", err);
  }
}

// Fallback image helper
export function getCategoryFallbackImage(categoryId?: string): string {
  const match = DEFAULT_UNIVERSAL_CATEGORIES.find((c) => c.id === categoryId);
  if (match) return match.heroImage;
  return "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80";
}
