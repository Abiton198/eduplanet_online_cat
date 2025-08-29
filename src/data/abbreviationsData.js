// /data/abbreviationsData.js
// Comprehensive CAT (NSC CAPS) abbreviations dataset for cards.

export const abbreviationsData = [
    // ===== Core (your originals) =====
    { abbr: "CPU", fullForm: "Central Processing Unit", definition: "Main processing unit of a computer.", use: "Executes instructions; controls I/O." },
    { abbr: "RAM", fullForm: "Random Access Memory", definition: "Temporary, volatile working memory.", use: "Holds active programs/data for fast access." },
    { abbr: "ROM", fullForm: "Read-Only Memory", definition: "Non-volatile firmware storage.", use: "Stores startup code (BIOS/UEFI)." },
    { abbr: "USB", fullForm: "Universal Serial Bus", definition: "Standard peripheral interface.", use: "Connect flash drives, keyboards, printers." },
    { abbr: "HDD", fullForm: "Hard Disk Drive", definition: "Magnetic permanent storage.", use: "Stores OS, apps, files." },
    { abbr: "SSD", fullForm: "Solid State Drive", definition: "Flash-based storage (no moving parts).", use: "Faster boot and load times." },
    { abbr: "LAN", fullForm: "Local Area Network", definition: "Network in a small area.", use: "Share printers, files, internet at school." },
    { abbr: "WAN", fullForm: "Wide Area Network", definition: "Network over large geographic areas.", use: "The internet is the biggest WAN." },
    { abbr: "IP", fullForm: "Internet Protocol", definition: "Addressing/forwarding rules for networks.", use: "Devices communicate via IP addresses." },
    { abbr: "ISP", fullForm: "Internet Service Provider", definition: "Company that provides internet access.", use: "MTN, Vodacom, Telkom, Afrihost." },
    { abbr: "HTTP", fullForm: "HyperText Transfer Protocol", definition: "Transfers web pages.", use: "Basis for web browsing." },
    { abbr: "HTTPS", fullForm: "HyperText Transfer Protocol Secure", definition: "Encrypted HTTP (TLS).", use: "Secure logins and payments." },
    { abbr: "URL", fullForm: "Uniform Resource Locator", definition: "Web address of a resource.", use: "https://www.education.gov.za" },
    { abbr: "DNS", fullForm: "Domain Name System", definition: "Name-to-IP translation.", use: "Turns google.com into an IP address." },
    { abbr: "VPN", fullForm: "Virtual Private Network", definition: "Encrypted tunnel over the internet.", use: "Secure remote access; privacy." },
    { abbr: "GUI", fullForm: "Graphical User Interface", definition: "Windows, icons, menus interface.", use: "Windows desktop; mobile UIs." },
    { abbr: "BIOS", fullForm: "Basic Input/Output System", definition: "Legacy firmware for boot/IO.", use: "Initialises hardware." },
    { abbr: "OS", fullForm: "Operating System", definition: "Manages hardware & software.", use: "Windows, macOS, Linux." },
    { abbr: "PDF", fullForm: "Portable Document Format", definition: "Fixed-layout document format.", use: "Exam papers; forms." },
    { abbr: "CSV", fullForm: "Comma-Separated Values", definition: "Plain-text table format.", use: "Import/export between Excel & DBs." },
    { abbr: "SQL", fullForm: "Structured Query Language", definition: "Language for relational databases.", use: "Query marks from a student table." },
    { abbr: "IPv4 / IPv6", fullForm: "Internet Protocol v4 / v6", definition: "32-bit vs 128-bit addressing.", use: "IPv6 provides many more addresses." },
    { abbr: "FTP", fullForm: "File Transfer Protocol", definition: "Transfers files over a network.", use: "Upload website files to a server." },
    { abbr: "SMTP", fullForm: "Simple Mail Transfer Protocol", definition: "Sends email between servers.", use: "Outgoing mail from clients to servers." },
    { abbr: "VoIP", fullForm: "Voice over Internet Protocol", definition: "Voice calls via IP.", use: "WhatsApp, Skype, Zoom audio." },
  
    // ===== Previously added common ones =====
    { abbr: "ICT", fullForm: "Information and Communication Technology", definition: "Tech for processing/communicating information.", use: "Computers, networks, internet." },
    { abbr: "HTML", fullForm: "HyperText Markup Language", definition: "Web page structure language.", use: "Defines headings, links, images." },
    { abbr: "CSS", fullForm: "Cascading Style Sheets", definition: "Presentation styling for web pages.", use: "Colours, layout, fonts." },
    { abbr: "SSL/TLS", fullForm: "Secure Sockets Layer / Transport Layer Security", definition: "Encryption protocols for networks.", use: "Padlock in browser for HTTPS." },
    { abbr: "AI", fullForm: "Artificial Intelligence", definition: "Machines simulating intelligent behaviour.", use: "Chatbots, image recognition." },
    { abbr: "IoT", fullForm: "Internet of Things", definition: "Internet-connected everyday devices.", use: "Smart bulbs, wearables, sensors." },
    { abbr: "PAN", fullForm: "Personal Area Network", definition: "Very short-range network.", use: "Bluetooth between phone and laptop." },
    { abbr: "MAN", fullForm: "Metropolitan Area Network", definition: "City-scale network.", use: "Connect campuses across a city." },
    { abbr: "ERP", fullForm: "Enterprise Resource Planning", definition: "Integrated business software suite.", use: "Finance, HR, supply chain." },
    { abbr: "CAD", fullForm: "Computer-Aided Design", definition: "Design/drafting software.", use: "Engineering & architecture drawings." },
    { abbr: "DTP", fullForm: "Desktop Publishing", definition: "Page layout for print/digital.", use: "Posters, brochures, magazines." },
    { abbr: "ASCII", fullForm: "American Standard Code for Information Interchange", definition: "7-bit character encoding.", use: "Represents text as numbers." },
  
    // ===== Display, media & printing =====
    { abbr: "DPI", fullForm: "Dots Per Inch", definition: "Print resolution measure.", use: "Higher DPI = sharper printed images." },
    { abbr: "PPI", fullForm: "Pixels Per Inch", definition: "Screen pixel density.", use: "Higher PPI = crisper displays." },
    { abbr: "RGB", fullForm: "Red Green Blue", definition: "Additive colour model for screens.", use: "Monitors, projectors, web graphics." },
    { abbr: "CMYK", fullForm: "Cyan Magenta Yellow Key(black)", definition: "Subtractive colour model for print.", use: "Printers; full-colour documents." },
    { abbr: "PPM", fullForm: "Pages Per Minute", definition: "Printer speed rating.", use: "Compares printer performance." },
    { abbr: "JPEG/JPG", fullForm: "Joint Photographic Experts Group", definition: "Compressed image format.", use: "Photos; small file sizes." },
    { abbr: "PNG", fullForm: "Portable Network Graphics", definition: "Lossless image with transparency.", use: "Logos/UI; crisp edges." },
    { abbr: "GIF", fullForm: "Graphics Interchange Format", definition: "Indexed colour + animation.", use: "Simple web animations." },
    { abbr: "SVG", fullForm: "Scalable Vector Graphics", definition: "Vector image format (XML).", use: "Icons/diagrams that scale cleanly." },
    { abbr: "MP3", fullForm: "MPEG-1 Audio Layer III", definition: "Compressed audio format.", use: "Music, podcasts." },
    { abbr: "MP4", fullForm: "MPEG-4 Part 14", definition: "Container for video/audio/subtitles.", use: "Videos for web/mobile." },
    { abbr: "WAV", fullForm: "Waveform Audio File Format", definition: "Uncompressed audio.", use: "High-quality recordings." },
  
    // ===== Display connectors / screens =====
    { abbr: "HDMI", fullForm: "High-Definition Multimedia Interface", definition: "Digital audio/video interface.", use: "Connect PC to monitor/TV." },
    { abbr: "VGA", fullForm: "Video Graphics Array", definition: "Legacy analogue video connector.", use: "Older monitors/projectors." },
    { abbr: "DVI", fullForm: "Digital Visual Interface", definition: "Digital (or analogue) video.", use: "Monitors before HDMI became standard." },
    { abbr: "LCD", fullForm: "Liquid Crystal Display", definition: "Flat-panel display tech.", use: "Monitors, laptops, TVs." },
    { abbr: "LED", fullForm: "Light Emitting Diode", definition: "Backlight or pixel tech.", use: "LED-backlit LCDs, LED panels." },
    { abbr: "OLED", fullForm: "Organic Light Emitting Diode", definition: "Self-emissive display pixels.", use: "Phones/TVs with deep blacks." },
  
    // ===== File systems & units =====
    { abbr: "NTFS", fullForm: "New Technology File System", definition: "Windows default filesystem.", use: "Supports permissions, large files." },
    { abbr: "FAT32", fullForm: "File Allocation Table 32", definition: "Legacy filesystem.", use: "Good device compatibility; 4GB file limit." },
    { abbr: "exFAT", fullForm: "Extended File Allocation Table", definition: "Modern FAT variant for flash.", use: "Large files; cross-platform drives." },
    { abbr: "KB/MB/GB/TB", fullForm: "Kilobyte/Megabyte/Gigabyte/Terabyte", definition: "Data size units.", use: "Measure files, RAM, storage." },
    { abbr: "RAID", fullForm: "Redundant Array of Independent Disks", definition: "Combines disks for speed/redundancy.", use: "RAID 1 mirroring; RAID 0 striping." },
  
    // ===== Hardware components =====
    { abbr: "GPU", fullForm: "Graphics Processing Unit", definition: "Processes graphics/parallel tasks.", use: "3D, video, AI acceleration." },
    { abbr: "ALU", fullForm: "Arithmetic Logic Unit", definition: "Performs arithmetic/logic ops.", use: "Core part of the CPU." },
    { abbr: "PSU", fullForm: "Power Supply Unit", definition: "Converts AC to DC for PC components.", use: "Powers motherboard, drives, GPU." },
    { abbr: "UPS", fullForm: "Uninterruptible Power Supply", definition: "Battery backup for devices.", use: "Keeps PC on during outages." },
    { abbr: "NIC", fullForm: "Network Interface Card", definition: "Hardware to connect to a network.", use: "Ethernet or Wi-Fi adapter." },
    { abbr: "MAC (addr.)", fullForm: "Media Access Control Address", definition: "Unique hardware address of NIC.", use: "Layer-2 identification on LAN." },
    { abbr: "PCIe", fullForm: "Peripheral Component Interconnect Express", definition: "High-speed expansion bus.", use: "GPUs, NVMe SSDs." },
    { abbr: "SATA", fullForm: "Serial ATA", definition: "Interface for HDDs/SSDs/optical drives.", use: "Connects storage to motherboard." },
    { abbr: "GHz/MHz", fullForm: "Gigahertz/Megahertz", definition: "Clock frequency units.", use: "CPU/GPU speeds; RAM data rate." },
  
    // ===== Networking protocols & terms =====
    { abbr: "TCP", fullForm: "Transmission Control Protocol", definition: "Reliable, connection-oriented transport.", use: "Web, email, file transfers." },
    { abbr: "UDP", fullForm: "User Datagram Protocol", definition: "Unreliable, connectionless transport.", use: "Streaming, VoIP, gaming." },
    { abbr: "DHCP", fullForm: "Dynamic Host Configuration Protocol", definition: "Automatically assigns IP settings.", use: "Gives devices IP, gateway, DNS." },
    { abbr: "NAT", fullForm: "Network Address Translation", definition: "Maps private to public IPs.", use: "Router lets many devices share one WAN IP." },
    { abbr: "SSID", fullForm: "Service Set Identifier", definition: "Wi-Fi network name.", use: "Select SSID to connect to WLAN." },
    { abbr: "WLAN", fullForm: "Wireless Local Area Network", definition: "Wi-Fi network.", use: "Wireless connectivity in a building." },
    { abbr: "Mbps/Gbps", fullForm: "Megabits/Gigabits per second", definition: "Network throughput units.", use: "Internet speeds, LAN links." },
    { abbr: "b/s", fullForm: "bits per second", definition: "Raw data rate unit.", use: "Bandwidth measurements." },
    { abbr: "MAC", fullForm: "Message Authentication Code", definition: "Integrity/authentication tag (crypto).", use: "Ensures data not altered in transit." },
  
    // ===== Email protocols =====
    { abbr: "IMAP", fullForm: "Internet Message Access Protocol", definition: "Syncs mail on server across devices.", use: "Keeps folders & read status in sync." },
    { abbr: "POP3", fullForm: "Post Office Protocol version 3", definition: "Downloads mail to one device.", use: "Offline access; may remove from server." },
  
    // ===== Security & auth =====
    { abbr: "2FA/MFA", fullForm: "Two-Factor / Multi-Factor Authentication", definition: "Extra verification beyond password.", use: "OTP, authenticator app, biometrics." },
    { abbr: "OTP", fullForm: "One-Time Password", definition: "Single-use code for login.", use: "Received via SMS/app for 2FA." },
    { abbr: "PIN", fullForm: "Personal Identification Number", definition: "Numeric secret for access.", use: "Unlock devices; verify identity." },
    { abbr: "ACL", fullForm: "Access Control List", definition: "Permissions attached to an object.", use: "Who can read/write a file." },
    { abbr: "DoS/DDoS", fullForm: "Denial of Service / Distributed DoS", definition: "Attack that overwhelms services.", use: "Floods a server with traffic." },
    { abbr: "CAPTCHA", fullForm: "Completely Automated Public Turing test to tell Computers and Humans Apart", definition: "Human-verification test.", use: "Prevents automated spam/bots." },
    { abbr: "AES", fullForm: "Advanced Encryption Standard", definition: "Widely used symmetric cipher.", use: "Encrypts data at rest/in transit." },
  
    // ===== Software/dev terms =====
    { abbr: "API", fullForm: "Application Programming Interface", definition: "Defined way apps/services interact.", use: "Apps call APIs for data/actions." },
    { abbr: "CLI", fullForm: "Command Line Interface", definition: "Text-based interface for commands.", use: "PowerShell, Bash." },
    { abbr: "IDE", fullForm: "Integrated Development Environment", definition: "Coding editor + tools.", use: "VS Code, IntelliJ, Eclipse." },
    { abbr: "SDK", fullForm: "Software Development Kit", definition: "Tools/libraries for building apps.", use: "Android SDK for mobile apps." },
  
    // ===== Databases & info systems =====
    { abbr: "DBMS", fullForm: "Database Management System", definition: "Software to manage databases.", use: "MySQL, SQL Server, PostgreSQL." },
    { abbr: "RDBMS", fullForm: "Relational DBMS", definition: "DBMS based on tables/relations.", use: "Stores rows in related tables." },
    { abbr: "ERD", fullForm: "Entity-Relationship Diagram", definition: "Diagram of data entities/relations.", use: "Plan a database schema." },
    { abbr: "TSV", fullForm: "Tab-Separated Values", definition: "Plain-text table with tabs.", use: "Alternative to CSV for clean commas." },
  
    // ===== Cloud & virtualisation =====
    { abbr: "SaaS", fullForm: "Software as a Service", definition: "Apps delivered over the internet.", use: "Google Workspace, Office 365." },
    { abbr: "PaaS", fullForm: "Platform as a Service", definition: "Hosted platform for building apps.", use: "Heroku, Azure App Service." },
    { abbr: "IaaS", fullForm: "Infrastructure as a Service", definition: "Virtual servers/networking storage.", use: "AWS EC2, Azure VMs." },
    { abbr: "VM", fullForm: "Virtual Machine", definition: "Software-emulated computer.", use: "Run another OS in a window." },
    { abbr: "VDI", fullForm: "Virtual Desktop Infrastructure", definition: "Hosted desktop environment.", use: "Thin clients for labs/offices." },
  
    // ===== Office formats =====
    { abbr: "DOCX", fullForm: "Office Open XML Word Document", definition: "Modern Word document format.", use: "Word processing files." },
    { abbr: "XLSX", fullForm: "Office Open XML Spreadsheet", definition: "Excel workbook format.", use: "Spreadsheets with formulas/charts." },
    { abbr: "PPTX", fullForm: "Office Open XML Presentation", definition: "PowerPoint presentation format.", use: "Slideshows with media." },
    { abbr: "ODF", fullForm: "Open Document Format", definition: "Open standard office docs.", use: "LibreOffice formats (ODT/ODS/ODP)." },
  
    // ===== BYOD & classroom tech =====
    { abbr: "BYOD", fullForm: "Bring Your Own Device", definition: "Learners use personal devices.", use: "Policies in schools/businesses." },
    { abbr: "LMS", fullForm: "Learning Management System", definition: "Platform to deliver/track learning.", use: "Moodle, Google Classroom." }
  ];
  