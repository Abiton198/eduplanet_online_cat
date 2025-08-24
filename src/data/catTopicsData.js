// /data/catTopicsData.js
// Grade 12 CAT — Exam-ready glossary dataset.
// Each topic includes definition, function/purpose bullets, and deep study arrays.

export const catTopics = [
    // 1) SOLID-STATE DRIVE (SSD)
    {
      id: "ssd",
      title: "Solid-State Drive (SSD)",
      definition:
        "A storage device that uses NAND flash memory (no moving parts) to store data, providing fast access times and high reliability compared to magnetic hard drives.",
      bullets: [
        "Provide persistent, high-speed storage for OS, apps, and data.",
        "Accelerate boot, load, and transfer operations versus HDD.",
        "Deliver shock-resistant, silent storage for mobile/desktop use."
      ],
      facts: [
        "Interfaces: SATA, mSATA, M.2 SATA, M.2 NVMe (PCIe x2/x4), U.2.",
        "Random IOPS are dramatically higher than HDDs (snappier OS).",
        "NVMe leverages PCIe lanes (Gen3/4/5) for massive throughput."
      ],
      examples: [
        "Samsung 970/980/990 NVMe series",
        "Crucial MX500 (SATA), P3/P5 (NVMe)",
        "WD Blue SN570 / Black SN850",
        "Kingston A2000/KC3000",
        "Apple MacBook soldered NVMe SSD"
      ],
      advantages: [
        "Very fast boot and load times.",
        "Shock resistant, silent operation.",
        "Lower power draw than HDD.",
        "No fragmentation performance penalty."
      ],
      uses: [
        "OS/boot drive and primary apps/games.",
        "Scratch disks for photo/video editing.",
        "Database caching and virtualization hosts.",
        "Portable external SSDs for backups."
      ],
      disadvantages: [
        "Higher cost per GB than HDD (especially at large capacities).",
        "Finite write endurance (though adequate for normal use).",
        "Performance may drop when SLC cache is exhausted.",
        "Some models throttle thermally without heatsinks."
      ],
      limitations: [
        "SATA capped around ~550 MB/s; needs NVMe for higher speeds.",
        "Very large capacities can be expensive.",
        "Soldered SSDs in some laptops are not user-replaceable."
      ],
      applicationsICT: [
        "Faster lab PCs and thin clients (quicker logins).",
        "Server VM storage pools and VDI performance boosts.",
        "Field laptops with rugged storage for data capture.",
        "High-speed portable media for video crews."
      ]
    },
  
    // 2) MEMORY CARD READER
    {
      id: "memory-card-reader",
      title: "Memory Card Reader",
      definition:
        "A device/slot that reads and writes removable flash memory cards (e.g., SD/microSD) and bridges them to a computer (USB/PCIe).",
      bullets: [
        "Provide a bridge to read/write removable camera/phone cards.",
        "Enable fast transfer/backup of media to computers.",
        "Support expandable/portable storage workflows."
      ],
      facts: [
        "Card families: SD/SDHC/SDXC; microSD equivalents.",
        "Speed classes: Class 10, U1/U3, V30/V60/V90 for video.",
        "UHS-II adds a second row of pins (higher throughput)."
      ],
      examples: [
        "USB-C UHS-II SD/microSD reader",
        "Laptop built-in SD slot",
        "Multi-card hub (SD, microSD, CFexpress)",
        "Camera tether cable + reader setup",
        "OTG phone adapters for microSD"
      ],
      advantages: [
        "Fast, removable, inexpensive media handling.",
        "Simple photo/video ingest without cables.",
        "Portability; supports many device ecosystems.",
        "No drivers needed in most OSes."
      ],
      uses: [
        "Photography/videography card offload.",
        "Raspberry Pi OS flashing to microSD.",
        "Android expandable storage management.",
        "Data transfer in computer labs."
      ],
      disadvantages: [
        "Card/click-spring wear over time.",
        "Potential for file corruption if removed unsafely.",
        "Counterfeit cards/reporting fake capacity.",
        "Readers vary widely in speed/quality."
      ],
      limitations: [
        "Small card size → easy to lose/physical damage.",
        "Speed bottleneck if reader is only USB 2.0.",
        "Some pro cards (CFexpress) require specific readers."
      ],
      applicationsICT: [
        "Media labs for fast content ingest.",
        "Field data collection (drones, sensors).",
        "Education: transferring student work easily.",
        "POS/embedded systems firmware updates."
      ]
    },
  
    // 3) MULTI-TOUCH SCREEN
    {
      id: "multi-touch",
      title: "Multi-touch Screen",
      definition:
        "A display/input surface that detects multiple simultaneous touch points to enable gestures such as pinch, zoom, rotate and multi-finger scrolling.",
      bullets: [
        "Provide direct, multi-point input for navigation and control.",
        "Enable gesture operations (pinch/zoom/rotate/scroll).",
        "Serve as an intuitive interface for kiosks, mobiles, and panels."
      ],
      facts: [
        "Technologies: capacitive (most common), resistive, infrared, optical.",
        "Capacitive uses the body’s conductivity; stylus needs special tips.",
        "Touch latency affects responsiveness (aim <10–20 ms for premium)."
      ],
      examples: [
        "Smartphones & tablets (iOS/Android)",
        "Laptop touchscreens (2-in-1s)",
        "Interactive classroom panels",
        "Kiosk/ATM touch displays",
        "Drawing tablets with touch + pen"
      ],
      advantages: [
        "Direct, intuitive input; no mouse required.",
        "Supports rich gesture controls.",
        "Great for kiosks and shared displays.",
        "Engaging for education and demos."
      ],
      uses: [
        "Mobile apps, drawing/annotation.",
        "Retail POS and information kiosks.",
        "Interactive whiteboards in classrooms.",
        "Assistive tech for accessibility."
      ],
      disadvantages: [
        "Smudges/fingerprints; needs cleaning.",
        "Can be less precise than mouse for tiny targets.",
        "Gloves/wet hands reduce accuracy (unless special mode).",
        "Repair costs higher than non-touch screens."
      ],
      limitations: [
        "Sunlight glare outdoors; requires brightness/anti-glare.",
        "Latency & refresh constraints affect feel.",
        "Palm rejection not perfect for all pens."
      ],
      applicationsICT: [
        "Digital signage/wayfinding maps.",
        "Museum/education exhibits.",
        "Touch-based lab check-ins/attendance.",
        "Healthcare bedside terminals."
      ]
    },
  
    // 4) HDMI
    {
      id: "hdmi",
      title: "HDMI (High-Definition Multimedia Interface)",
      definition:
        "A digital interface and cable standard that carries high-quality video and audio together between devices such as computers, TVs, and projectors.",
      bullets: [
        "Carry digital video and audio over a single cable between devices.",
        "Simplify A/V hookups for displays, projectors, and sound systems.",
        "Support high resolutions/refresh rates and device control features."
      ],
      facts: [
        "Common connectors: Standard (Type A), Mini (Type C), Micro (Type D).",
        "Key versions: 1.4 (1080p/4K30), 2.0 (4K60), 2.1 (4K120/8K).",
        "CEC lets one remote control multiple HDMI devices."
      ],
      examples: [
        "Laptop → projector/TV in classrooms",
        "Consoles → HDTV/monitor",
        "PC → monitor with 4K60",
        "Soundbar via HDMI ARC",
        "USB-C to HDMI adapters"
      ],
      advantages: [
        "One cable simplicity for A/V.",
        "High resolution + multichannel audio.",
        "Ubiquitous ports and cables.",
        "CEC convenience for control."
      ],
      uses: [
        "Presentations and lessons on big screens.",
        "Home theaters and conference rooms.",
        "Gaming setups with high refresh displays.",
        "Digital signage players."
      ],
      disadvantages: [
        "Handshake/HDCP compatibility issues.",
        "Cable length limits (active cables may be needed).",
        "Version mismatches cap features.",
        "Adapters vary in quality."
      ],
      limitations: [
        "Long runs need boosters/fiber HDMI.",
        "Bandwidth limited by version/cable.",
        "Fragile ports if stressed—avoid strain."
      ],
      applicationsICT: [
        "AV carts in schools/offices.",
        "Video walls and signage controllers.",
        "Lecture capture/recording chains.",
        "Hybrid meeting room integrations."
      ]
    },
  
    // 5) 3D PRINTING/PRINTERS
    {
      id: "3d-printing",
      title: "3D Printing/Printers",
      definition:
        "Additive manufacturing that builds 3D objects from digital models by depositing/fusing material in successive layers.",
      bullets: [
        "Convert 3D CAD models into physical objects layer-by-layer.",
        "Enable rapid prototyping and custom, on-demand parts.",
        "Support classroom/maker projects with tangible models."
      ],
      facts: [
        "FDM extrudes thermoplastic filament; layer heights often 0.1–0.3 mm.",
        "SLA cures liquid resin with UV for fine detail; needs washing/curing.",
        "SLS sinters nylon powder; strong parts; no support structures."
      ],
      examples: [
        "Prototype enclosures & jigs",
        "Replacement gears/clips/knobs",
        "Architectural miniatures",
        "STEM classroom models",
        "Custom mounts for drones/robots"
      ],
      advantages: [
        "Rapid prototyping; low tooling cost.",
        "Complex geometries possible.",
        "On-demand, small batch parts.",
        "Good for education, iteration."
      ],
      uses: [
        "Product design, fixtures, medical models.",
        "Makerspaces and STEM learning.",
        "Custom brackets for ICT installs.",
        "Spare parts for lab equipment."
      ],
      disadvantages: [
        "Slow per part; unsuitable for mass production.",
        "Limited materials vs industrial methods.",
        "Post-processing time and cost.",
        "Consumables can be expensive."
      ],
      limitations: [
        "Strength depends on orientation/layers.",
        "Surface finish may show layer lines.",
        "Temperature/humidity affect results."
      ],
      applicationsICT: [
        "Rapid casing prototypes for devices.",
        "Cable management clips/organizers.",
        "Sensor mounts for IoT pilots.",
        "Custom VESA adapters for displays."
      ]
    },
  
    // 6) 802.11 A/B/G/N
    {
      id: "wifi-80211",
      title: "802.11 a/b/g/n (Wi-Fi)",
      definition:
        "A family of IEEE wireless LAN standards defining how devices communicate over radio to join and use networks.",
      bullets: [
        "Provide wireless LAN access for devices in 2.4/5 GHz bands.",
        "Enable roaming connectivity to network/internet resources.",
        "Secure sessions via WPA2/WPA3 authentication and encryption."
      ],
      facts: [
        "802.11b: 2.4 GHz up to 11 Mbps (DSSS).",
        "802.11a: 5 GHz up to 54 Mbps (OFDM).",
        "802.11n: MIMO; up to 600 Mbps (channel bonding)."
      ],
      examples: [
        "School Wi-Fi for labs and classes",
        "Home routers/APs",
        "Campus hotspots",
        "Public libraries & cafes",
        "Printer/IoT device Wi-Fi connections"
      ],
      advantages: [
        "Mobility—no cables to move around.",
        "Easy guest access and BYOD support.",
        "Scalable with multiple APs.",
        "Roaming between APs with controllers."
      ],
      uses: [
        "Internet access for students/teachers.",
        "VoIP/Video conferencing (if QoS in place).",
        "Wireless printing & file access.",
        "IoT sensors and tablets in classrooms."
      ],
      disadvantages: [
        "Interference and congestion reduce speed.",
        "Security risks if poorly configured.",
        "Distance and obstacles weaken signal.",
        "Shared medium—bandwidth is finite."
      ],
      limitations: [
        "Throughput is half-duplex; airtime overhead.",
        "Legacy clients can slow the network.",
        "AP density must match device counts."
      ],
      applicationsICT: [
        "Managed WLAN with VLANs for staff/students.",
        "RADIUS authentication (802.1X).",
        "Policy-based QoS for video calls.",
        "WIPS/WIDS for rogue AP detection."
      ]
    },
  
    // 7) LTE (LONG TERM EVOLUTION)
    {
      id: "lte",
      title: "LTE (Long Term Evolution)",
      definition:
        "A 4G cellular standard for high-speed packet data on mobile networks, succeeding 3G with higher spectral efficiency and lower latency.",
      bullets: [
        "Provide mobile broadband for browsing, apps, and streaming.",
        "Carry voice as data using VoLTE for clearer calls.",
        "Enable internet access where fixed lines are unavailable."
      ],
      facts: [
        "Defined by 3GPP (Release 8+); LTE-A adds carrier aggregation.",
        "Typical downlink latency: ~30–50 ms; much lower than 3G.",
        "MIMO antennas improve throughput/reliability."
      ],
      examples: [
        "Smartphones/tablets with 4G",
        "LTE routers for remote classrooms",
        "IoT gateways with SIMs",
        "Hotspot devices for field trips",
        "Bus/coach Wi-Fi using LTE backhaul"
      ],
      advantages: [
        "High speeds for HD video and cloud apps.",
        "Broad coverage in urban and many rural areas.",
        "Lower latency helps interactive apps.",
        "Portable internet without fixed lines."
      ],
      uses: [
        "Hybrid learning (video conferencing on the move).",
        "Mobile payment terminals.",
        "Failover internet for small offices.",
        "IoT telemetry (e.g., traffic signs)."
      ],
      disadvantages: [
        "Data plans can be costly/limited.",
        "Battery drain under weak signal.",
        "Network congestion at peak times.",
        "Coverage gaps in remote regions."
      ],
      limitations: [
        "Speeds depend on signal & band aggregation.",
        "Carrier NAT may block inbound connections.",
        "Uplink often much slower than downlink."
      ],
      applicationsICT: [
        "Rapid deployment of pop-up classrooms/events.",
        "Backup connectivity for critical services.",
        "Mobile labs with SIM-enabled routers.",
        "Telemetry for kiosks/remote sensors."
      ]
    },
  
    // 8) NEAR FIELD COMMUNICATION (NFC)
    {
      id: "nfc",
      title: "Near Field Communication (NFC)",
      definition:
        "A short-range (a few centimeters) wireless technology enabling devices to exchange small amounts of data by touching or close proximity.",
      bullets: [
        "Enable tap-and-go exchanges for payments and access.",
        "Support quick device pairing and automation via tags.",
        "Provide short-range, low-power data transfer for small payloads."
      ],
      facts: [
        "Standards: ISO/IEC 14443 and NFC Forum specs.",
        "NDEF is a common data format on NFC tags.",
        "Tag types vary in capacity and rewritability."
      ],
      examples: [
        "Contactless payments (phones/cards)",
        "Smart posters with NFC tags",
        "Tap to pair Bluetooth speakers",
        "Access control badges",
        "Transit cards & turnstiles"
      ],
      advantages: [
        "Quick, convenient user experience.",
        "Low power; simple interactions.",
        "Short range adds physical security.",
        "No pairing menus for tag use."
      ],
      uses: [
        "Payments, attendance, access control.",
        "Launching apps/shortcuts via tags.",
        "Sharing small data (contacts/links).",
        "Device provisioning in IT setups."
      ],
      disadvantages: [
        "Low data rate—not for large files.",
        "Security relies on ecosystem policies.",
        "Not all devices have NFC readers.",
        "Tag cloning risks if poorly managed."
      ],
      limitations: [
        "Very short range (centimeters).",
        "Metal surfaces can detune antennas.",
        "Tag memory is small (bytes to KBs)."
      ],
      applicationsICT: [
        "Student ID/attendance taps.",
        "Asset tags for quick device info.",
        "Printer one-tap setup cards.",
        "Kiosk logins and shortcuts."
      ]
    },
  
    // 9) VIDEO COMMUNICATIONS
    {
      id: "video-comms",
      title: "Video Communications",
      definition:
        "Real-time or near-real-time communication using live video streams (calling/conferencing) and video sharing in meetings.",
      bullets: [
        "Deliver real-time video/audio for meetings, classes, and support.",
        "Provide screen/video sharing for collaboration and demos.",
        "Connect remote participants with controls for chat/files/recording."
      ],
      facts: [
        "Codecs: H.264/H.265/VP9/AV1 compress video for networks.",
        "MCU mixes streams centrally; SFU forwards selective streams.",
        "Echo cancellation, AGC, and noise suppression improve audio."
      ],
      examples: [
        "Zoom, Microsoft Teams, Google Meet",
        "WebRTC browser calls",
        "Classroom hybrid teaching",
        "Telemedicine video sessions",
        "Company town halls"
      ],
      advantages: [
        "Connects distributed participants in real time.",
        "Saves travel time/costs.",
        "Supports content/screen sharing.",
        "Recording allows later review."
      ],
      uses: [
        "Online classes and tutoring.",
        "Project meetings & standups.",
        "Parent-teacher conferences.",
        "Remote interviews/orals."
      ],
      disadvantages: [
        "High data/bandwidth usage.",
        "Requires good devices and lighting/audio.",
        "Fatigue from long meetings.",
        "Privacy concerns when recording."
      ],
      limitations: [
        "Dependent on internet stability.",
        "Shared Wi-Fi can impair quality.",
        "School policies may limit features."
      ],
      applicationsICT: [
        "Learning management system integrations.",
        "Proctoring/oral assessments online.",
        "Virtual open days and assemblies.",
        "IT support via remote video."
      ]
    },
  
    // 10) URL SHORTENER
    {
      id: "url-shortener",
      title: "URL Shortener",
      definition:
        "A service that converts a long URL into a shorter alias that redirects (usually via HTTP 301) to the original address.",
      bullets: [
        "Convert long links into short, shareable aliases.",
        "Improve readability, memorability, and SMS/print usage.",
        "Provide click analytics and branded/custom slugs."
      ],
      facts: [
        "Redirection types: 301 (permanent), 302/307 (temporary).",
        "Custom domains improve trust (e.g., sch.ly/homework).",
        "UTM parameters enable campaign analytics."
      ],
      examples: [
        "Bitly, TinyURL, Rebrandly",
        "Custom school short domain",
        "QR links on posters",
        "SMS-friendly links",
        "Share meeting links cleanly"
      ],
      advantages: [
        "Clean, memorable links.",
        "Clickable analytics/metrics.",
        "Can mask very long query strings.",
        "Good for print and SMS."
      ],
      uses: [
        "Share assignments/resources.",
        "Track engagement in campaigns.",
        "Event registration links.",
        "Printable QR handouts."
      ],
      disadvantages: [
        "Users may distrust opaque links.",
        "If service is down, links break.",
        "Some sites block shortened URLs.",
        "Potential for phishing misuse."
      ],
      limitations: [
        "Dependence on third-party service uptime.",
        "Limited metadata unless using paid plans.",
        "Institution policies may restrict use."
      ],
      applicationsICT: [
        "School comms dashboards with click stats.",
        "Short links in LMS announcements.",
        "QR codes for classroom stations.",
        "Helpdesk knowledge base links."
      ]
    },
  
    // 11) INTERNET OF THINGS (IoT)
    {
      id: "iot",
      title: "Internet of Things (IoT)",
      definition:
        "A network of everyday objects embedded with sensors/actuators and connectivity to collect, exchange and act on data.",
      bullets: [
        "Connect sensors/actuators to collect telemetry and events.",
        "Enable automation and remote monitoring/control.",
        "Feed analytics/dashboards for insight and alerts."
      ],
      facts: [
        "Sensors: temperature, motion, GPS, humidity, air quality, etc.",
        "Connectivity: Wi-Fi, Bluetooth LE, Zigbee, LoRaWAN, cellular.",
        "Edge computing processes data locally before cloud upload."
      ],
      examples: [
        "Smart thermostats & lights",
        "Wearable health trackers",
        "Asset tags & beacons",
        "Smart irrigation/greenhouses",
        "Environmental sensors in labs"
      ],
      advantages: [
        "Automation, efficiency and insight from data.",
        "Remote monitoring and alerts.",
        "Predictive maintenance reduces downtime.",
        "New services (usage-based)."
      ],
      uses: [
        "Building management (HVAC/lighting).",
        "Fleet/asset tracking.",
        "Smart classrooms (occupancy).",
        "Safety monitoring (CO₂, smoke)."
      ],
      disadvantages: [
        "Attack surface expands (default passwords, weak updates).",
        "Privacy concerns from continuous data collection.",
        "Vendor lock-in and fragmentation.",
        "Complex maintenance at scale."
      ],
      limitations: [
        "Battery life limits sensor frequency.",
        "Radio coverage/throughput limits.",
        "Regulatory compliance (data protection)."
      ],
      applicationsICT: [
        "Campus dashboards with live sensor feeds.",
        "Automated alerts to IT/maintenance.",
        "Energy savings via occupancy-based control.",
        "Loaner device tracking with tags."
      ]
    },
  
    // 12) AUTONOMOUS VEHICLES
    {
      id: "autonomous-vehicles",
      title: "Autonomous Vehicles",
      definition:
        "Self-driving vehicles that sense the environment using cameras, radar, lidar, GPS and onboard computing to navigate with little/no human input.",
      bullets: [
        "Perceive surroundings and plan/execute driving tasks autonomously.",
        "Reduce accidents and expand mobility through driver assistance.",
        "Optimize transport efficiency with coordinated routing."
      ],
      facts: [
        "SAE levels 0–5 classify automation extent.",
        "HD maps plus real-time perception guide planning.",
        "V2X can improve awareness (vehicle/infrastructure)."
      ],
      examples: [
        "Robotaxis and autonomous shuttles",
        "Driver-assist (lane keep, ACC)",
        "Self-driving delivery pods",
        "Autonomous mining trucks",
        "Campus mail robots"
      ],
      advantages: [
        "Potentially fewer collisions (human error reduction).",
        "Improved mobility for non-drivers.",
        "Optimized routing → fuel/time savings.",
        "Continuous operation (logistics efficiency)."
      ],
      uses: [
        "Delivery services, public transport pilots.",
        "Agriculture and mining operations.",
        "Warehouse/yard logistics.",
        "Shuttle services on campuses."
      ],
      disadvantages: [
        "High development and hardware costs.",
        "Complex legal/ethical issues.",
        "Job displacement concerns.",
        "Security risks if systems hacked."
      ],
      limitations: [
        "Performance degrades in severe weather.",
        "Maps/markings must be accurate.",
        "Requires strong connectivity for updates/telemetry."
      ],
      applicationsICT: [
        "V2X communication infrastructure.",
        "Fleet telematics & remote monitoring.",
        "Edge ML model deployment/updates.",
        "Safety case data logging and analysis."
      ]
    },
  
    // 13) DRONE TECHNOLOGY
    {
      id: "drones",
      title: "Drone Technology",
      definition:
        "Unmanned aircraft (UAV) that fly via remote control or autonomously using GPS, sensors and onboard software.",
      bullets: [
        "Provide aerial data capture, mapping, and inspection.",
        "Access hazardous/remote areas faster and at lower cost.",
        "Support deliveries and emergency/industrial missions."
      ],
      facts: [
        "Frames: quadcopter, hexacopter, fixed-wing, VTOL.",
        "Sensors: IMU, barometer, GPS/RTK, obstacle avoidance.",
        "Payloads: cameras, LiDAR, thermal, multispectral."
      ],
      examples: [
        "Disaster damage assessment",
        "Aerial surveying/mapping",
        "Wildlife monitoring/anti-poaching",
        "Power line/roof inspection",
        "Parcel/medical delivery pilots"
      ],
      advantages: [
        "Rapid deployment & overview.",
        "Reach inaccessible/unsafe areas.",
        "High-resolution data capture.",
        "Lower cost than manned aircraft."
      ],
      uses: [
        "Agriculture crop health scans.",
        "Journalism/sports filming.",
        "Scientific sampling in hazards.",
        "Security perimeter patrols."
      ],
      disadvantages: [
        "Privacy concerns with cameras.",
        "Collision/injury risks; skill required.",
        "Battery limits; weather constraints.",
        "Signal loss or GPS multipath issues."
      ],
      limitations: [
        "Short flight times without swappable packs.",
        "Payload weight trade-offs.",
        "Restricted airspace and licensing."
      ],
      applicationsICT: [
        "GIS processing and 3D mapping.",
        "Streaming telemetry to dashboards.",
        "Integration with emergency response systems.",
        "Automated mission scheduling."
      ]
    },
  
    // 14) WEARABLE DEVICES AND TECHNOLOGIES
    {
      id: "wearables",
      title: "Wearable Devices & Technologies",
      definition:
        "Body-worn electronics (watches, bands, glasses, clothing) that sense, process and share data with other devices or the cloud.",
      bullets: [
        "Capture health/activity data continuously for feedback and alerts.",
        "Provide quick interactions/notifications via connected devices.",
        "Integrate with safety, navigation, and accessibility workflows."
      ],
      facts: [
        "Sensors: PPG heart rate, SpO2, ECG, accelerometer/gyro, temp.",
        "Sync via BLE; some have LTE/eSIM for standalone.",
        "Battery life varies from hours (AR) to weeks (simple bands)."
      ],
      examples: [
        "Smartwatches & fitness bands",
        "AR/VR headsets",
        "Smart rings",
        "Medical glucose/ECG wearables",
        "Smart safety helmets"
      ],
      advantages: [
        "Convenient, hands-free data capture.",
        "Encourages proactive health behavior.",
        "Immediate notifications & prompts.",
        "Assistive tech for navigation/vision."
      ],
      uses: [
        "PE class fitness tracking.",
        "Worker fatigue/heat stress monitoring.",
        "Authentication (proximity unlock).",
        "Quick controls (timers, reminders)."
      ],
      disadvantages: [
        "Privacy concerns (location/biometrics).",
        "Potential data inaccuracies.",
        "Security risks if devices/apps compromised.",
        "Distraction in classrooms/workplaces."
      ],
      limitations: [
        "Small batteries → limited runtime.",
        "Form-factor discomfort for some users.",
        "Data silos across vendor platforms."
      ],
      applicationsICT: [
        "Fleet/crew safety dashboards.",
        "Attendance/auth with wearables.",
        "Health analytics for wellness programs.",
        "AR assistance for maintenance tasks."
      ]
    },
  
    // 15) SHAPING (NETWORK TUNING)
    {
      id: "shaping",
      title: "Shaping (Network Tuning)",
      definition:
        "A QoS technique that prioritizes certain traffic (e.g., email/VoIP) while slowing less critical services to keep key applications responsive.",
      bullets: [
        "Prioritize critical apps/services during congestion.",
        "Allocate/limit bandwidth by policy, time, or user group.",
        "Maintain acceptable latency/jitter for voice/video/LMS."
      ],
      facts: [
        "Implements rate limits/queues by application/port/DSCP.",
        "Time-based policies (business hours vs after hours).",
        "Often de-prioritizes P2P/torrents & bulk downloads."
      ],
      examples: [
        "Prioritize LMS/Zoom; de-prioritize streaming",
        "Reserve bandwidth for exams",
        "Give staff VLAN higher QoS",
        "Guest Wi-Fi rate limits",
        "Branch WAN shaping appliances"
      ],
      advantages: [
        "Ensures critical apps remain usable.",
        "Reduces perceived congestion.",
        "Predictable performance for key services.",
        "Better fairness across users."
      ],
      uses: [
        "School networks during assessments.",
        "Call centers & telemedicine.",
        "Remote branch WAN optimization.",
        "Public hotspots with limited backhaul."
      ],
      disadvantages: [
        "Non-critical services may feel slow.",
        "DPI raises privacy concerns.",
        "Policy complexity/maintenance.",
        "Can be controversial if opaque."
      ],
      limitations: [
        "Cannot create bandwidth—only manage it.",
        "Encrypted traffic may hide app identity.",
        "Legacy devices may misclassify traffic."
      ],
      applicationsICT: [
        "SD-WAN policies per application.",
        "Controller-based WLAN QoS profiles.",
        "ISP service tiers & traffic management.",
        "Exam-mode shaping templates."
      ]
    },
  
    // 16) THROTTLING (POLICING)
    {
      id: "throttling",
      title: "Throttling (Policing)",
      definition:
        "Intentional speed reduction by an ISP or network when usage exceeds policy thresholds (AUP/FUP), or to reduce congestion.",
      bullets: [
        "Limit user/application speeds after heavy or abusive usage.",
        "Protect shared network capacity and service stability.",
        "Implement fair-use policies on residential/guest links."
      ],
      facts: [
        "Fair Use Policies define thresholds/time windows.",
        "Can be per-user, per-app, per-SIM, or cell-wide.",
        "May be temporary until the next billing cycle."
      ],
      examples: [
        "Uncapped home plan slowed after 400 GB",
        "Mobile hotspot speed reduced after 20 GB",
        "Campus guest Wi-Fi capped at 2 Mbps",
        "Cloud backups throttled during day",
        "Streaming capped to SD quality"
      ],
      advantages: [
        "Prevents overloads and crashes.",
        "Allows fairer distribution of capacity.",
        "Predictable service levels for many.",
        "Encourages efficient usage patterns."
      ],
      uses: [
        "Residential ISP networks.",
        "Mobile data plans with tiers.",
        "Campus guest networks.",
        "Event networks with limited backhaul."
      ],
      disadvantages: [
        "Poor user experience when throttled.",
        "Confusion on ‘uncapped’ marketing.",
        "Can hinder legitimate academic use.",
        "Workarounds create policy conflicts."
      ],
      limitations: [
        "Cannot solve true capacity shortages.",
        "Difficult to perfectly identify heavy users vs needs.",
        "Risk of misclassification of traffic."
      ],
      applicationsICT: [
        "Policy-driven rate limits per SSID/VLAN.",
        "Time-of-day caps for non-critical services.",
        "Mobile device management data limits.",
        "Guest network speed tiers."
      ]
    },
  
    // 17) GEOTAGGING
    {
      id: "geotagging",
      title: "Geotagging",
      definition:
        "Embedding geographic coordinates (latitude/longitude) and related metadata into media files such as photos or posts.",
      bullets: [
        "Store location metadata with photos/videos for organization.",
        "Enable mapping, search, and context in media apps.",
        "Support location-aware workflows and evidence trails."
      ],
      facts: [
        "EXIF fields store GPS, altitude, compass, timestamp.",
        "Smartphones estimate via GPS + Wi-Fi/cell triangulation.",
        "Apps can strip EXIF on share; settings control location use."
      ],
      examples: [
        "Travel photo maps",
        "Wildlife/geology fieldwork",
        "Incident reporting with location",
        "Smart album organization",
        "AR apps anchored to places"
      ],
      advantages: [
        "Easy organization and search.",
        "Context for storytelling and evidence.",
        "Enables location-aware features.",
        "Supports science and surveys."
      ],
      uses: [
        "Journalism and documentation.",
        "Asset/site inspections.",
        "Tourism apps and guides.",
        "Education field trips."
      ],
      disadvantages: [
        "Privacy risks (home/school location exposure).",
        "Stalking/harassment potential if shared publicly.",
        "Incorrect tags mislead viewers.",
        "Battery drain from GPS."
      ],
      limitations: [
        "GPS accuracy varies with environment.",
        "No signal indoors/underground.",
        "EXIF removed by some platforms."
      ],
      applicationsICT: [
        "Digital evidence management.",
        "Photo library indexing in schools.",
        "Location-aware mobile learning.",
        "AR campus navigation."
      ]
    },
  
    // 18) CLICK-JACKING
    {
      id: "click-jacking",
      title: "Click-jacking",
      definition:
        "A UI redressing attack where a malicious page overlays or frames another page so a user clicks on something different from what they see.",
      bullets: [
        "Trick users into unintended clicks via hidden frames/overlays.",
        "Abuse visual deception to trigger actions (like/buy/transfer).",
        "Target sensitive operations where a single click has impact."
      ],
      facts: [
        "Victims think they click harmless buttons but trigger hidden actions.",
        "Common on social networks as 'like-jacking' or fake 'play' buttons.",
        "Cursor-jacking misaligns the visual cursor and real click target."
      ],
      examples: [
        "Invisible 'Like' button overlaid on a video area",
        "Hidden 'Buy/Subscribe' under a 'Next' button",
        "Bank transfer form framed at 0.1 opacity",
        "Malicious ad makes user click 'Allow' for notifications",
        "Game site that tricks users to share credentials"
      ],
      advantages: [
        "None for users; attackers exploit trust/attention.",
        "Awareness improves user caution and security habits.",
        "Pushes sites to adopt modern security headers.",
        "Encourages least-privilege, anti-CSRF design."
      ],
      uses: [
        "Security teaching examples of UI attacks.",
        "Testing labs for CSP/X-Frame-Options.",
        "Browser security research & demos.",
        "Policy writing for web dev standards."
      ],
      disadvantages: [
        "Exposes users to unauthorized actions.",
        "Damages brand trust and user safety.",
        "Can leak personal data or trigger purchases.",
        "Hard to detect purely from user perspective."
      ],
      limitations: [
        "Attacks rely on framing/overlay—headers can block.",
        "User scripts/ad-blockers may prevent many cases.",
        "Modern browsers reduce mixed-content/overlay tricks.",
        "Still possible when sites omit headers or misconfigure."
      ],
      applicationsICT: [
        "Set CSP frame-ancestors and X-Frame-Options on school portals.",
        "Train learners to spot suspicious overlays and pop-ups.",
        "Add confirmation dialogs for critical actions.",
        "Automated security tests in CI for headers."
      ]
    },
  
    // 19) RANSOMWARE
    {
      id: "ransomware",
      title: "Ransomware",
      definition:
        "Malware that encrypts files/systems and demands payment (often cryptocurrency) for a decryption key.",
      bullets: [
        "Encrypt victim data to extort payment through decryption keys.",
        "Spread via phishing, exploits, or weak remote access.",
        "Disrupt operations to pressure organizations into paying."
      ],
      facts: [
        "Crypto-lockers encrypt locally and network shares.",
        "Double extortion: data theft + encryption + leak threats.",
        "Initial access via macros, weak passwords, exposed RDP."
      ],
      examples: [
        "School file server encrypted after phishing email",
        "Lab PCs hit via malicious USB autorun",
        "SMB share encryption from one infected endpoint",
        "RDP brute-forced small office server",
        "Malvertising leads to a drive-by download"
      ],
      advantages: [
        "No advantages to victims; case studies strengthen security posture.",
        "Drives backup discipline and patch cadence.",
        "Encourages MFA on remote access.",
        "Improves asset inventories and monitoring."
      ],
      uses: [
        "Curriculum on cyber-hygiene and IR plans.",
        "Table-top exercises in ICT classes.",
        "Tools training: backup/restore drills.",
        "SOC-style log analysis practice."
      ],
      disadvantages: [
        "Data loss/downtime; exam disruption.",
        "Potential data breach and privacy fines.",
        "Recovery costs and reputational harm.",
        "Psychological stress on staff/students."
      ],
      limitations: [
        "Antivirus alone cannot stop all variants.",
        "Paying ransom does not guarantee decryption.",
        "Old OSes without patches remain vulnerable.",
        "Shadow copies can be deleted by malware."
      ],
      applicationsICT: [
        "Network segmentation and least privilege.",
        "Regular offline backups & restore tests.",
        "MFA for admin/remote access, disable macros.",
        "EDR, logging, and incident runbooks."
      ]
    },
  
    // 20) SCREEN LOCK PATTERN
    {
      id: "screen-lock-pattern",
      title: "Screen Lock Pattern",
      definition:
        "A device unlock method where users draw a pattern connecting nodes (typically a 3×3 grid) instead of entering a PIN/password.",
      bullets: [
        "Authenticate users by drawing a memorized pattern.",
        "Provide quick unlocks for frequent device access.",
        "Complement biometrics/PIN when combined in policy."
      ],
      facts: [
        "Minimum length usually 4 nodes; cannot repeat nodes in default rules.",
        "Users prefer starting from top-left → predictable patterns.",
        "Longer patterns with crossovers are stronger."
      ],
      examples: [
        "Android 3×3 pattern unlock",
        "Tablet shared in a lab with pattern + PIN",
        "Pattern + fingerprint on mid-range phones",
        "Pattern for younger learners; PIN for staff",
        "Pattern unlock with longer 7-9 nodes"
      ],
      advantages: [
        "Fast and easy for frequent use.",
        "Memorable without typing.",
        "Good for large touchscreens.",
        "Works with limited literacy/typing skill."
      ],
      uses: [
        "Shared classroom tablets.",
        "BYOD devices for quick access.",
        "Kiosk devices with guided access.",
        "Low-risk devices with simple lock."
      ],
      disadvantages: [
        "Easier to guess/observe than strong PIN.",
        "Smudge and shoulder-surf attacks.",
        "Not accepted by some enterprise policies.",
        "May encourage overly simple shapes."
      ],
      limitations: [
        "Grid size limits entropy compared to long PIN/password.",
        "Accessibility issues for users with motor impairments.",
        "Fails against coercion/social engineering.",
        "Reset requires account recovery measures."
      ],
      applicationsICT: [
        "MDM policies requiring biometrics + PIN.",
        "Auto-lock and wipe after failed attempts.",
        "Screen protectors to reduce smudge trails.",
        "Training on privacy/anti-shoulder-surfing."
      ]
    },
  
    // 21) AUTHENTICATION
    {
      id: "authentication",
      title: "Authentication",
      definition:
        "The process of verifying a user’s identity before granting access to systems, data, or services.",
      bullets: [
        "Verify identity using knowledge/possession/inherence factors.",
        "Strengthen assurance by combining factors (MFA/2FA).",
        "Federate logins across apps using SSO standards."
      ],
      facts: [
        "Knowledge: passwords/PINs; Possession: tokens/phones; Inherence: biometrics.",
        "MFA resists phishing/password reuse.",
        "SSO via SAML, OAuth 2.0, OpenID Connect."
      ],
      examples: [
        "School Google/Microsoft SSO",
        "Authenticator app 6-digit codes",
        "Security keys (FIDO2) for admins",
        "Face/fingerprint unlock on devices",
        "Parent portal with 2FA"
      ],
      advantages: [
        "Protects accounts and sensitive data.",
        "Reduces helpdesk resets with SSO.",
        "Improves audit/compliance posture.",
        "Supports BYOD with conditional access."
      ],
      uses: [
        "LMS, grading systems, email, Wi-Fi portals.",
        "Admin consoles and remote support tools.",
        "VPN and cloud apps with SSO.",
        "Library/resource access control."
      ],
      disadvantages: [
        "User friction if MFA poorly designed.",
        "Password fatigue and reuse risks.",
        "SSO outage becomes single point of failure.",
        "Biometric privacy concerns."
      ],
      limitations: [
        "Legacy apps may not support modern SSO.",
        "Offline authentication for some factors is hard.",
        "Hardware token cost/management.",
        "Social engineering still bypasses weak processes."
      ],
      applicationsICT: [
        "Roll out MFA to staff/students.",
        "Adopt SSO with conditional access.",
        "Enforce password policies & managers.",
        "Monitor risky sign-ins and coach users."
      ]
    },
  
    // 22) CROWDFUNDING
    {
      id: "crowdfunding",
      title: "Crowd Funding",
      definition:
        "Raising small amounts of money from many people online to fund a project, product, or cause.",
      bullets: [
        "Aggregate small contributions to finance projects/causes.",
        "Exchange donations for rewards, equity, or repayment (model-dependent).",
        "Build community and validate demand pre-launch."
      ],
      facts: [
        "Donation: charitable; Reward: perks/pre-orders; Equity: shares; Lending: repay with interest.",
        "Campaign pages need clear goals, budgets, and timelines.",
        "Stretch goals can increase funds but add delivery risk."
      ],
      examples: [
        "Open-source hardware board funding",
        "Educational robotics kits",
        "Community Wi-Fi hotspot project",
        "Local e-learning content series",
        "Assistive technology campaigns"
      ],
      advantages: [
        "Access to capital without banks.",
        "Market validation and early feedback.",
        "Builds a community of supporters.",
        "Publicity for ICT/ed-tech ideas."
      ],
      uses: [
        "School makerspace equipment.",
        "Non-profit digital inclusion projects.",
        "App development seed funds.",
        "STEM kit manufacturing."
      ],
      disadvantages: [
        "High failure risk to deliver on time.",
        "Fees + shipping/logistics complexity.",
        "Public criticism if delays occur.",
        "Intellectual property exposure."
      ],
      limitations: [
        "Equity/lending restricted by law.",
        "Requires strong marketing effort.",
        "Saturated platforms limit visibility.",
        "Backer fatigue without updates."
      ],
      applicationsICT: [
        "Fund open-source software/features.",
        "Pilot community networks/IoT sensors.",
        "Digital literacy programs.",
        "Hardware prototype runs."
      ]
    },
  
    // 23) BYOD
    {
      id: "byod",
      title: "BYOD (Bring Your Own Device)",
      definition:
        "A policy allowing students or employees to use personal devices for school or work access under defined security controls.",
      bullets: [
        "Allow personal devices while enforcing security/compliance.",
        "Segment networks and apply MDM/MAM/NAC policies.",
        "Balance user privacy with institutional risk management."
      ],
      facts: [
        "MDM/MAM can enforce PIN, encryption, and remote wipe.",
        "NAC controls who/what may join Wi-Fi/VPN.",
        "Containerization separates work/personal data."
      ],
      examples: [
        "Student phones on student SSID only",
        "Teacher laptops with MDM profiles",
        "Guest captive portal with time-limited access",
        "Per-app VPN for grading app",
        "Conditional access based on device compliance"
      ],
      advantages: [
        "Lower hardware costs for institutions.",
        "Users prefer familiar devices.",
        "Flexibility and mobility improve productivity.",
        "Reduces device distribution logistics."
      ],
      uses: [
        "Classroom research and LMS access.",
        "Mobile email/calendar for staff.",
        "On-site attendance apps.",
        "Field data collection."
      ],
      disadvantages: [
        "Security risks from unmanaged devices.",
        "Fragmented OS versions and support.",
        "Potential privacy disputes.",
        "Wi-Fi capacity pressures."
      ],
      limitations: [
        "Not all apps support mixed ownership.",
        "Limited control on personal devices.",
        "Legal constraints on monitoring.",
        "Equity concerns (not all can afford devices)."
      ],
      applicationsICT: [
        "Segregated VLANs/SSIDs + firewalls.",
        "MDM enrollment with compliance rules.",
        "Self-service portals for certificates.",
        "Awareness training for users."
      ]
    },
  
    // 24) BIG DATA
    {
      id: "big-data",
      title: "Big Data",
      definition:
        "Extremely large and complex datasets that require specialized tools and techniques to capture, store, process, and analyze.",
      bullets: [
        "Ingest/store vast, varied, fast-moving data at scale.",
        "Process/Analyze (batch + streaming) to extract insight.",
        "Govern data for quality, privacy, security, and value."
      ],
      facts: [
        "Platforms: Hadoop ecosystem, Spark, Flink, Kafka.",
        "NoSQL stores: key-value, document, columnar, graph.",
        "Data lakes store raw data; warehouses serve curated analytics."
      ],
      examples: [
        "Clickstream analysis for education portals",
        "IoT sensor time-series from campuses",
        "Public health datasets",
        "Transport smart-card usage data",
        "E-learning engagement telemetry"
      ],
      advantages: [
        "Deeper insights and predictions.",
        "Data-driven decisions and optimization.",
        "Personalized learning/experiences.",
        "Detect fraud and anomalies."
      ],
      uses: [
        "Student success analytics and early alerts.",
        "Capacity planning for networks.",
        "Operational dashboards for ICT.",
        "Research with open datasets."
      ],
      disadvantages: [
        "Costly tooling and skills shortage.",
        "Privacy/ethics risks and bias.",
        "Data silos and integration pain.",
        "Complexity leads to project failures."
      ],
      limitations: [
        "Garbage-in, garbage-out—needs quality data.",
        "Latency for batch analytics.",
        "Compute/storage budgets can balloon.",
        "Regulatory constraints on data retention."
      ],
      applicationsICT: [
        "Central log/data lake for telemetry.",
        "Real-time alerts from streaming data.",
        "BI dashboards for leadership.",
        "ML pipelines for forecasts."
      ]
    },
  
    // 25) CRYPTOCURRENCIES
    {
      id: "cryptocurrencies",
      title: "Cryptocurrencies",
      definition:
        "Digital assets that use cryptography and distributed ledgers (often blockchain) to enable peer-to-peer value transfer without central banks.",
      bullets: [
        "Enable peer-to-peer value transfer without central intermediaries.",
        "Secure transactions through keys, signatures, and consensus.",
        "Support programmable money via smart contracts on some chains."
      ],
      facts: [
        "Consensus: Proof-of-Work, Proof-of-Stake, and variants.",
        "Public/private keys sign transactions.",
        "Exchanges bridge fiat ↔ crypto; KYC/AML may apply."
      ],
      examples: [
        "Bitcoin (BTC), Ethereum (ETH)",
        "Stablecoins (USDC, USDT)",
        "Layer-2 networks (Lightning, rollups)",
        "NFTs for digital ownership",
        "Cross-border remittances"
      ],
      advantages: [
        "Fast global transfers (minutes/seconds).",
        "Programmable money (smart contracts).",
        "Financial access for underbanked.",
        "Transparent public ledgers."
      ],
      uses: [
        "Online payments/donations.",
        "Micropayments and tipping.",
        "Token-gated content/apps.",
        "Crowdfunding with tokens."
      ],
      disadvantages: [
        "Price volatility and loss risk.",
        "Irreversible transactions if mis-sent.",
        "Regulatory uncertainty.",
        "Security burden on users (keys)."
      ],
      limitations: [
        "Scalability vs decentralization trade-offs.",
        "Fees can spike during demand.",
        "Key loss = asset loss.",
        "Merchant adoption varies."
      ],
      applicationsICT: [
        "Payment integration in apps.",
        "Identity/attestation with on-chain proofs.",
        "Automated payouts via smart contracts.",
        "Experimentation in computer science classes."
      ]
    },
  
    // 26) E-LEARNING & M-LEARNING
    {
      id: "e-m-learning",
      title: "E-Learning and M-Learning",
      definition:
        "E-learning uses electronic networks and devices for learning; M-learning emphasizes mobile devices for anywhere/anytime access.",
      bullets: [
        "Deliver instruction digitally in synchronous/asynchronous modes.",
        "Host content/quizzes/grades in an LMS with tracking.",
        "Provide mobile access for learning anytime, anywhere."
      ],
      facts: [
        "Synchronous: live classes/webinars; Asynchronous: self-paced modules.",
        "SCORM/xAPI standards track progress/competencies.",
        "Universal Design for Learning improves accessibility."
      ],
      examples: [
        "Google Classroom/Moodle/Canvas",
        "Mobile LMS apps for assignments",
        "Recorded lectures + transcripts",
        "Quiz apps with item banks",
        "Offline PDF readers with sync"
      ],
      advantages: [
        "Flexible access and pacing.",
        "Resource reuse and scalability.",
        "Immediate feedback and analytics.",
        "Inclusive features (captions, readers)."
      ],
      uses: [
        "Blended/hybrid classrooms.",
        "Teacher PD and certifications.",
        "Revision and exam prep.",
        "Emergency remote teaching."
      ],
      disadvantages: [
        "Digital divide and device inequity.",
        "Distraction/fatigue online.",
        "Content quality varies.",
        "Academic integrity challenges."
      ],
      limitations: [
        "Bandwidth/device constraints.",
        "Accessibility gaps if not designed well.",
        "Hands-on labs harder remotely.",
        "Support burden for LMS admins."
      ],
      applicationsICT: [
        "Single sign-on with student directories.",
        "Integrations: video, proctoring, plagiarism checks.",
        "Analytics dashboards for staff.",
        "Content authoring toolchains."
      ]
    },
  
    // 27) VIRTUAL REALITY (VR)
    {
      id: "vr",
      title: "Virtual Reality (VR)",
      definition:
        "Immersive computer-generated environments viewed through head-mounted displays with head/hand tracking.",
      bullets: [
        "Simulate immersive 3D environments for training and exploration.",
        "Enable safe practice of dangerous/expensive scenarios.",
        "Visualize complex concepts with interactive presence."
      ],
      facts: [
        "Tracking: inside-out cameras or external base stations.",
        "Degrees of freedom: 3DoF vs 6DoF.",
        "Frame rates 72–120+ Hz reduce motion sickness."
      ],
      examples: [
        "Virtual science labs",
        "Historical site walkthroughs",
        "Driver/pilot simulators",
        "Therapy & exposure training",
        "3D art/design studios"
      ],
      advantages: [
        "Safe practice for dangerous/expensive tasks.",
        "High engagement and retention.",
        "Visualize complex 3D concepts.",
        "Remote collaboration in shared spaces."
      ],
      uses: [
        "STEM experiments and training.",
        "Career/technical education.",
        "Design reviews and prototyping.",
        "Soft-skills role-play."
      ],
      disadvantages: [
        "Motion sickness in some users.",
        "Hardware cost and maintenance.",
        "Content development time.",
        "Isolation from the real world."
      ],
      limitations: [
        "Field of view, resolution constraints.",
        "Battery life on standalone devices.",
        "Space and safety requirements.",
        "Accessibility for glasses/vision issues."
      ],
      applicationsICT: [
        "VR labs with device management.",
        "Content pipelines with 3D engines.",
        "Networked multi-user VR sessions.",
        "Assistive VR for special education."
      ]
    },
  
    // 28) AUGMENTED REALITY (AR)
    {
      id: "ar",
      title: "Augmented Reality (AR)",
      definition:
        "Technology that overlays digital information (3D models, text, effects) onto the real world through phones, tablets, or AR glasses.",
      bullets: [
        "Overlay digital info on the real world for guidance and context.",
        "Provide step-by-step assistance and visualization during tasks.",
        "Enhance learning/marketing with interactive, place-aware content."
      ],
      facts: [
        "Marker-based uses images/QR; markerless uses plane detection/SLAM.",
        "ARKit/ARCore provide mobile AR frameworks.",
        "Occlusion and lighting estimation improve realism."
      ],
      examples: [
        "AR anatomy overlays",
        "Museum exhibits with AR labels",
        "AR maintenance instructions",
        "Try-before-you-buy furniture apps",
        "Campus navigation arrows"
      ],
      advantages: [
        "Context-aware learning in place.",
        "No need for full headsets (phones suffice).",
        "Enhances print/posters with interactivity.",
        "Improves first-time fix rates for repairs."
      ],
      uses: [
        "Classroom visualization on worksheets.",
        "Field work guidance (labs, workshops).",
        "Retail/marketing experiences.",
        "Tourism and cultural heritage."
      ],
      disadvantages: [
        "Device heat/battery drain.",
        "Limited accuracy outdoors/low light.",
        "Camera permissions/privacy concerns.",
        "Can distract users from hazards."
      ],
      limitations: [
        "Tracking drift over long sessions.",
        "Small screens limit immersion.",
        "Glare and sunlight challenges.",
        "Headset comfort/weight issues."
      ],
      applicationsICT: [
        "AR help for IT deployments.",
        "Interactive textbooks/posters.",
        "Wayfinding for large campuses.",
        "Remote support overlays."
      ]
    },
  
    // 29) ARTIFICIAL INTELLIGENCE (AI)
    {
      id: "ai",
      title: "Artificial Intelligence (AI)",
      definition:
        "Techniques that enable machines to perform tasks that typically require human intelligence, such as perception, learning, reasoning, and language.",
      bullets: [
        "Automate perception/decision tasks with data-driven models.",
        "Learn patterns from data to make predictions or generate content.",
        "Augment human work with assistants, recommendations, and alerts."
      ],
      facts: [
        "Supervised/unsupervised/reinforcement learning paradigms.",
        "Neural networks (CNNs/RNNs/Transformers) dominate many tasks.",
        "Training vs inference phases with different compute needs."
      ],
      examples: [
        "Spam/phishing detection",
        "Image recognition and OCR",
        "Speech-to-text captioning",
        "Recommendation engines",
        "Chatbots and tutoring aids"
      ],
      advantages: [
        "Automation of repetitive tasks.",
        "Insights from large datasets.",
        "Assistive tools for accessibility.",
        "24/7 support via bots."
      ],
      uses: [
        "Student support & marking assistance.",
        "Network anomaly detection.",
        "Predictive maintenance.",
        "Content moderation."
      ],
      disadvantages: [
        "Errors/bias can harm fairness.",
        "Opaque decision-making.",
        "Data/privacy concerns.",
        "Job displacement fears."
      ],
      limitations: [
        "Requires quality labeled data.",
        "Domain shift reduces accuracy.",
        "Compute/energy costs.",
        "Regulatory constraints."
      ],
      applicationsICT: [
        "Helpdesk triage/intake bots.",
        "Proctoring/anomaly detection (policy-governed).",
        "Smart routing of tickets/incidents.",
        "Accessibility tools (live captions)."
      ]
    },
  
    // 30) 4TH INDUSTRIAL REVOLUTION (4IR)
    {
      id: "4ir",
      title: "4th Industrial Revolution (4IR)",
      definition:
        "The fusion of physical, digital, and biological technologies—AI, robotics, IoT, additive manufacturing—transforming industries and society.",
      bullets: [
        "Integrate cyber-physical systems across production and services.",
        "Use data/AI/automation to optimize and personalize at scale.",
        "Reshape skills and workflows toward digital, analytical work."
      ],
      facts: [
        "Automation connects sensors→analytics→actuators.",
        "Cloud + edge computing distribute intelligence.",
        "Digital twins mirror real-world assets."
      ],
      examples: [
        "Smart factories and warehouses",
        "Precision agriculture",
        "Connected healthcare devices",
        "Autonomous logistics",
        "Smart cities & grids"
      ],
      advantages: [
        "Higher productivity and quality.",
        "New products and services.",
        "Resource/energy efficiency.",
        "Safer work via automation."
      ],
      uses: [
        "Predictive maintenance with IoT/AI.",
        "Real-time supply chain visibility.",
        "Adaptive learning systems.",
        "Teleoperation/remote work."
      ],
      disadvantages: [
        "Workforce displacement fears.",
        "Cybersecurity risks increase.",
        "Digital divide widens.",
        "Vendor lock-in to platforms."
      ],
      limitations: [
        "Legacy systems integration hurdles.",
        "Skills shortages slow adoption.",
        "Capex/Opex for transformation.",
        "Regulatory and safety approvals."
      ],
      applicationsICT: [
        "OT/IT convergence projects.",
        "Edge gateways and sensors.",
        "Industrial data platforms.",
        "Secure SD-WAN/5G networks."
      ]
    },
  
    // 31) 5TH INDUSTRIAL REVOLUTION (5IR)
    {
      id: "5ir",
      title: "5th Industrial Revolution (5IR)",
      definition:
        "A human-centric evolution emphasizing collaboration between humans and intelligent machines with a focus on sustainability and inclusion.",
      bullets: [
        "Align technology with human well-being, inclusion, and purpose.",
        "Collaborate with AI/co-bots to augment—not replace—workers.",
        "Embed sustainability and ethics into design and operations."
      ],
      facts: [
        "Focus on well-being and meaningful work.",
        "Augmented workers (AR/AI copilots).",
        "Circular economy and renewable energy."
      ],
      examples: [
        "Co-bots on factory floors",
        "AI copilots for teachers/clinicians",
        "Energy-efficient data centers",
        "Assistive tech for disabilities",
        "Community tech hubs"
      ],
      advantages: [
        "Aligns tech with human values.",
        "Broader access to automation benefits.",
        "Sustainability and resilience gains.",
        "Higher job satisfaction potential."
      ],
      uses: [
        "Human-AI collaboration in classrooms.",
        "Green ICT initiatives (power management).",
        "Accessible design across apps.",
        "Citizen science platforms."
      ],
      disadvantages: [
        "Hard to measure human-centric outcomes.",
        "Potential ethics-washing if superficial.",
        "Costs to retrofit sustainability.",
        "Cultural resistance to change."
      ],
      limitations: [
        "Policy/regulation need to catch up.",
        "Data privacy vs personalization trade-offs.",
        "Not all tasks are augmentable.",
        "Funding gaps for social tech."
      ],
      applicationsICT: [
        "AI copilots with educator oversight.",
        "Green procurement for devices/cloud.",
        "Inclusive UX standards and audits.",
        "Energy telemetry and optimization."
      ]
    },
  
    // 32) BLOCKCHAIN
    {
      id: "blockchain",
      title: "Blockchain",
      definition:
        "A distributed append-only ledger of transactions grouped in blocks, cryptographically linked and replicated across many nodes.",
      bullets: [
        "Maintain tamper-evident shared ledgers across multiple parties.",
        "Coordinate trustless transactions through consensus protocols.",
        "Automate agreements with on-chain smart contracts."
      ],
      facts: [
        "Each block references the previous block’s hash.",
        "Full nodes validate; miners/validators propose blocks.",
        "Public vs permissioned chains for different trust models."
      ],
      examples: [
        "Supply-chain provenance tracking",
        "Tamper-evident academic certificates",
        "Digital identity/attestation",
        "NFT ticketing",
        "Cross-border payments"
      ],
      advantages: [
        "Tamper-evident records across parties.",
        "Reduced need for central intermediaries.",
        "Programmable business logic.",
        "Auditable, time-stamped history."
      ],
      uses: [
        "Credential verification for graduates.",
        "Asset tracking and warranties.",
        "e-Voting pilots (permissioned).",
        "Automated escrow/payments."
      ],
      disadvantages: [
        "Complexity and hype risk misalignment.",
        "Public chain fees/volatility.",
        "Privacy challenges of open ledgers.",
        "Key management is hard for users."
      ],
      limitations: [
        "Scalability vs decentralization trade-off.",
        "Regulatory uncertainty.",
        "Irreversibility of errors.",
        "Not efficient for high-TPS databases."
      ],
      applicationsICT: [
        "Issue verifiable certificates/diplomas.",
        "Audit trails for ICT changes.",
        "License/contract automation.",
        "Secure multi-party data sharing."
      ]
    }
  ];
  
  export default catTopics;
  