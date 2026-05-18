// ─── countries.js ─────────────────────────────────────────────────────────────
// Complete world country list with:
//   - ISO 3166-1 alpha-2 code
//   - Flag emoji
//   - Dial code (phone prefix)
//   - Optional regions/provinces array (SA fully detailed; others use generic state label)
// Used by SchoolRegistration for country picker, phone prefix, and region dropdown.

export const COUNTRIES = [
    { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', dial: '+93', regionLabel: 'Province' },
    { code: 'AL', name: 'Albania', flag: '🇦🇱', dial: '+355', regionLabel: 'County' },
    { code: 'DZ', name: 'Algeria', flag: '🇩🇿', dial: '+213', regionLabel: 'Province' },
    { code: 'AD', name: 'Andorra', flag: '🇦🇩', dial: '+376', regionLabel: 'Parish' },
    { code: 'AO', name: 'Angola', flag: '🇦🇴', dial: '+244', regionLabel: 'Province' },
    { code: 'AG', name: 'Antigua & Barbuda', flag: '🇦🇬', dial: '+1', regionLabel: 'Parish' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial: '+54', regionLabel: 'Province' },
    { code: 'AM', name: 'Armenia', flag: '🇦🇲', dial: '+374', regionLabel: 'Province' },
    {
        code: 'AU', name: 'Australia', flag: '🇦🇺', dial: '+61', regionLabel: 'State/Territory',
        regions: ['Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia']
    },
    { code: 'AT', name: 'Austria', flag: '🇦🇹', dial: '+43', regionLabel: 'State' },
    { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', dial: '+994', regionLabel: 'District' },
    { code: 'BS', name: 'Bahamas', flag: '🇧🇸', dial: '+1', regionLabel: 'District' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dial: '+973', regionLabel: 'Governorate' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dial: '+880', regionLabel: 'Division' },
    { code: 'BB', name: 'Barbados', flag: '🇧🇧', dial: '+1', regionLabel: 'Parish' },
    { code: 'BY', name: 'Belarus', flag: '🇧🇾', dial: '+375', regionLabel: 'Region' },
    { code: 'BE', name: 'Belgium', flag: '🇧🇪', dial: '+32', regionLabel: 'Province' },
    { code: 'BZ', name: 'Belize', flag: '🇧🇿', dial: '+501', regionLabel: 'District' },
    { code: 'BJ', name: 'Benin', flag: '🇧🇯', dial: '+229', regionLabel: 'Department' },
    { code: 'BT', name: 'Bhutan', flag: '🇧🇹', dial: '+975', regionLabel: 'District' },
    { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dial: '+591', regionLabel: 'Department' },
    { code: 'BA', name: 'Bosnia & Herzegovina', flag: '🇧🇦', dial: '+387', regionLabel: 'Canton' },
    { code: 'BW', name: 'Botswana', flag: '🇧🇼', dial: '+267', regionLabel: 'District' },
    {
        code: 'BR', name: 'Brazil', flag: '🇧🇷', dial: '+55', regionLabel: 'State',
        regions: ['Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins']
    },
    { code: 'BN', name: 'Brunei', flag: '🇧🇳', dial: '+673', regionLabel: 'District' },
    { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', dial: '+359', regionLabel: 'Oblast' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226', regionLabel: 'Region' },
    { code: 'BI', name: 'Burundi', flag: '🇧🇮', dial: '+257', regionLabel: 'Province' },
    { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻', dial: '+238', regionLabel: 'Municipality' },
    { code: 'KH', name: 'Cambodia', flag: '🇰🇭', dial: '+855', regionLabel: 'Province' },
    { code: 'CM', name: 'Cameroon', flag: '🇨🇲', dial: '+237', regionLabel: 'Region' },
    {
        code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1', regionLabel: 'Province/Territory',
        regions: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Québec', 'Saskatchewan', 'Yukon']
    },
    { code: 'CF', name: 'Central African Republic', flag: '🇨🇫', dial: '+236', regionLabel: 'Prefecture' },
    { code: 'TD', name: 'Chad', flag: '🇹🇩', dial: '+235', regionLabel: 'Region' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱', dial: '+56', regionLabel: 'Region' },
    { code: 'CN', name: 'China', flag: '🇨🇳', dial: '+86', regionLabel: 'Province' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴', dial: '+57', regionLabel: 'Department' },
    { code: 'KM', name: 'Comoros', flag: '🇰🇲', dial: '+269', regionLabel: 'Island' },
    { code: 'CG', name: 'Congo', flag: '🇨🇬', dial: '+242', regionLabel: 'Department' },
    { code: 'CD', name: 'Congo (DR)', flag: '🇨🇩', dial: '+243', regionLabel: 'Province' },
    { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dial: '+506', regionLabel: 'Province' },
    { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dial: '+225', regionLabel: 'District' },
    { code: 'HR', name: 'Croatia', flag: '🇭🇷', dial: '+385', regionLabel: 'County' },
    { code: 'CU', name: 'Cuba', flag: '🇨🇺', dial: '+53', regionLabel: 'Province' },
    { code: 'CY', name: 'Cyprus', flag: '🇨🇾', dial: '+357', regionLabel: 'District' },
    { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', dial: '+420', regionLabel: 'Region' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰', dial: '+45', regionLabel: 'Region' },
    { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', dial: '+253', regionLabel: 'Region' },
    { code: 'DM', name: 'Dominica', flag: '🇩🇲', dial: '+1', regionLabel: 'Parish' },
    { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', dial: '+1', regionLabel: 'Province' },
    { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dial: '+593', regionLabel: 'Province' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬', dial: '+20', regionLabel: 'Governorate' },
    { code: 'SV', name: 'El Salvador', flag: '🇸🇻', dial: '+503', regionLabel: 'Department' },
    { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶', dial: '+240', regionLabel: 'Province' },
    { code: 'ER', name: 'Eritrea', flag: '🇪🇷', dial: '+291', regionLabel: 'Region' },
    { code: 'EE', name: 'Estonia', flag: '🇪🇪', dial: '+372', regionLabel: 'County' },
    { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', dial: '+268', regionLabel: 'Region' },
    { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', dial: '+251', regionLabel: 'Region' },
    { code: 'FJ', name: 'Fiji', flag: '🇫🇯', dial: '+679', regionLabel: 'Division' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮', dial: '+358', regionLabel: 'Region' },
    { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33', regionLabel: 'Region' },
    { code: 'GA', name: 'Gabon', flag: '🇬🇦', dial: '+241', regionLabel: 'Province' },
    { code: 'GM', name: 'Gambia', flag: '🇬🇲', dial: '+220', regionLabel: 'Division' },
    { code: 'GE', name: 'Georgia', flag: '🇬🇪', dial: '+995', regionLabel: 'Region' },
    {
        code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49', regionLabel: 'State',
        regions: ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia']
    },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '+233', regionLabel: 'Region' },
    { code: 'GR', name: 'Greece', flag: '🇬🇷', dial: '+30', regionLabel: 'Region' },
    { code: 'GD', name: 'Grenada', flag: '🇬🇩', dial: '+1', regionLabel: 'Parish' },
    { code: 'GT', name: 'Guatemala', flag: '🇬🇹', dial: '+502', regionLabel: 'Department' },
    { code: 'GN', name: 'Guinea', flag: '🇬🇳', dial: '+224', regionLabel: 'Region' },
    { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', dial: '+245', regionLabel: 'Region' },
    { code: 'GY', name: 'Guyana', flag: '🇬🇾', dial: '+592', regionLabel: 'Region' },
    { code: 'HT', name: 'Haiti', flag: '🇭🇹', dial: '+509', regionLabel: 'Department' },
    { code: 'HN', name: 'Honduras', flag: '🇭🇳', dial: '+504', regionLabel: 'Department' },
    { code: 'HU', name: 'Hungary', flag: '🇭🇺', dial: '+36', regionLabel: 'County' },
    { code: 'IS', name: 'Iceland', flag: '🇮🇸', dial: '+354', regionLabel: 'Region' },
    {
        code: 'IN', name: 'India', flag: '🇮🇳', dial: '+91', regionLabel: 'State',
        regions: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal']
    },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dial: '+62', regionLabel: 'Province' },
    { code: 'IR', name: 'Iran', flag: '🇮🇷', dial: '+98', regionLabel: 'Province' },
    { code: 'IQ', name: 'Iraq', flag: '🇮🇶', dial: '+964', regionLabel: 'Governorate' },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪', dial: '+353', regionLabel: 'County' },
    { code: 'IL', name: 'Israel', flag: '🇮🇱', dial: '+972', regionLabel: 'District' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹', dial: '+39', regionLabel: 'Region' },
    { code: 'JM', name: 'Jamaica', flag: '🇯🇲', dial: '+1', regionLabel: 'Parish' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵', dial: '+81', regionLabel: 'Prefecture' },
    { code: 'JO', name: 'Jordan', flag: '🇯🇴', dial: '+962', regionLabel: 'Governorate' },
    { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', dial: '+7', regionLabel: 'Region' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '+254', regionLabel: 'County' },
    { code: 'KI', name: 'Kiribati', flag: '🇰🇮', dial: '+686', regionLabel: 'Island' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dial: '+965', regionLabel: 'Governorate' },
    { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', dial: '+996', regionLabel: 'Region' },
    { code: 'LA', name: 'Laos', flag: '🇱🇦', dial: '+856', regionLabel: 'Province' },
    { code: 'LV', name: 'Latvia', flag: '🇱🇻', dial: '+371', regionLabel: 'Municipality' },
    { code: 'LB', name: 'Lebanon', flag: '🇱🇧', dial: '+961', regionLabel: 'Governorate' },
    { code: 'LS', name: 'Lesotho', flag: '🇱🇸', dial: '+266', regionLabel: 'District' },
    { code: 'LR', name: 'Liberia', flag: '🇱🇷', dial: '+231', regionLabel: 'County' },
    { code: 'LY', name: 'Libya', flag: '🇱🇾', dial: '+218', regionLabel: 'District' },
    { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', dial: '+423', regionLabel: 'Municipality' },
    { code: 'LT', name: 'Lithuania', flag: '🇱🇹', dial: '+370', regionLabel: 'County' },
    { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dial: '+352', regionLabel: 'Canton' },
    { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dial: '+261', regionLabel: 'Region' },
    { code: 'MW', name: 'Malawi', flag: '🇲🇼', dial: '+265', regionLabel: 'Region' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dial: '+60', regionLabel: 'State' },
    { code: 'MV', name: 'Maldives', flag: '🇲🇻', dial: '+960', regionLabel: 'Atoll' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱', dial: '+223', regionLabel: 'Region' },
    { code: 'MT', name: 'Malta', flag: '🇲🇹', dial: '+356', regionLabel: 'Region' },
    { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭', dial: '+692', regionLabel: 'Atoll' },
    { code: 'MR', name: 'Mauritania', flag: '🇲🇷', dial: '+222', regionLabel: 'Region' },
    { code: 'MU', name: 'Mauritius', flag: '🇲🇺', dial: '+230', regionLabel: 'District' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽', dial: '+52', regionLabel: 'State' },
    { code: 'FM', name: 'Micronesia', flag: '🇫🇲', dial: '+691', regionLabel: 'State' },
    { code: 'MD', name: 'Moldova', flag: '🇲🇩', dial: '+373', regionLabel: 'District' },
    { code: 'MC', name: 'Monaco', flag: '🇲🇨', dial: '+377', regionLabel: 'Quarter' },
    { code: 'MN', name: 'Mongolia', flag: '🇲🇳', dial: '+976', regionLabel: 'Province' },
    { code: 'ME', name: 'Montenegro', flag: '🇲🇪', dial: '+382', regionLabel: 'Municipality' },
    { code: 'MA', name: 'Morocco', flag: '🇲🇦', dial: '+212', regionLabel: 'Region' },
    { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', dial: '+258', regionLabel: 'Province' },
    { code: 'MM', name: 'Myanmar', flag: '🇲🇲', dial: '+95', regionLabel: 'Region' },
    { code: 'NA', name: 'Namibia', flag: '🇳🇦', dial: '+264', regionLabel: 'Region' },
    { code: 'NR', name: 'Nauru', flag: '🇳🇷', dial: '+674', regionLabel: 'District' },
    { code: 'NP', name: 'Nepal', flag: '🇳🇵', dial: '+977', regionLabel: 'Province' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dial: '+31', regionLabel: 'Province' },
    { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dial: '+64', regionLabel: 'Region' },
    { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', dial: '+505', regionLabel: 'Department' },
    { code: 'NE', name: 'Niger', flag: '🇳🇪', dial: '+227', regionLabel: 'Region' },
    {
        code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234', regionLabel: 'State',
        regions: ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara']
    },
    { code: 'NO', name: 'Norway', flag: '🇳🇴', dial: '+47', regionLabel: 'County' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲', dial: '+968', regionLabel: 'Governorate' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dial: '+92', regionLabel: 'Province' },
    { code: 'PW', name: 'Palau', flag: '🇵🇼', dial: '+680', regionLabel: 'State' },
    { code: 'PA', name: 'Panama', flag: '🇵🇦', dial: '+507', regionLabel: 'Province' },
    { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬', dial: '+675', regionLabel: 'Province' },
    { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dial: '+595', regionLabel: 'Department' },
    { code: 'PE', name: 'Peru', flag: '🇵🇪', dial: '+51', regionLabel: 'Region' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭', dial: '+63', regionLabel: 'Region' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱', dial: '+48', regionLabel: 'Voivodeship' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '+351', regionLabel: 'District' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦', dial: '+974', regionLabel: 'Municipality' },
    { code: 'RO', name: 'Romania', flag: '🇷🇴', dial: '+40', regionLabel: 'County' },
    { code: 'RU', name: 'Russia', flag: '🇷🇺', dial: '+7', regionLabel: 'Federal Subject' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dial: '+250', regionLabel: 'Province' },
    { code: 'KN', name: 'Saint Kitts & Nevis', flag: '🇰🇳', dial: '+1', regionLabel: 'Parish' },
    { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨', dial: '+1', regionLabel: 'Quarter' },
    { code: 'VC', name: 'Saint Vincent & the Grenadines', flag: '🇻🇨', dial: '+1', regionLabel: 'Parish' },
    { code: 'WS', name: 'Samoa', flag: '🇼🇸', dial: '+685', regionLabel: 'District' },
    { code: 'SM', name: 'San Marino', flag: '🇸🇲', dial: '+378', regionLabel: 'Municipality' },
    { code: 'ST', name: 'São Tomé & Príncipe', flag: '🇸🇹', dial: '+239', regionLabel: 'District' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dial: '+966', regionLabel: 'Region' },
    { code: 'SN', name: 'Senegal', flag: '🇸🇳', dial: '+221', regionLabel: 'Region' },
    { code: 'RS', name: 'Serbia', flag: '🇷🇸', dial: '+381', regionLabel: 'District' },
    { code: 'SC', name: 'Seychelles', flag: '🇸🇨', dial: '+248', regionLabel: 'District' },
    { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', dial: '+232', regionLabel: 'Province' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬', dial: '+65', regionLabel: 'Region' },
    { code: 'SK', name: 'Slovakia', flag: '🇸🇰', dial: '+421', regionLabel: 'Region' },
    { code: 'SI', name: 'Slovenia', flag: '🇸🇮', dial: '+386', regionLabel: 'Municipality' },
    { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧', dial: '+677', regionLabel: 'Province' },
    { code: 'SO', name: 'Somalia', flag: '🇸🇴', dial: '+252', regionLabel: 'Region' },
    {
        code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial: '+27', regionLabel: 'Province',
        regions: ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape']
    },
    { code: 'SS', name: 'South Sudan', flag: '🇸🇸', dial: '+211', regionLabel: 'State' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸', dial: '+34', regionLabel: 'Autonomous Community' },
    { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dial: '+94', regionLabel: 'Province' },
    { code: 'SD', name: 'Sudan', flag: '🇸🇩', dial: '+249', regionLabel: 'State' },
    { code: 'SR', name: 'Suriname', flag: '🇸🇷', dial: '+597', regionLabel: 'District' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪', dial: '+46', regionLabel: 'County' },
    { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dial: '+41', regionLabel: 'Canton' },
    { code: 'SY', name: 'Syria', flag: '🇸🇾', dial: '+963', regionLabel: 'Governorate' },
    { code: 'TW', name: 'Taiwan', flag: '🇹🇼', dial: '+886', regionLabel: 'County' },
    { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯', dial: '+992', regionLabel: 'Region' },
    { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dial: '+255', regionLabel: 'Region' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭', dial: '+66', regionLabel: 'Province' },
    { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱', dial: '+670', regionLabel: 'Municipality' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬', dial: '+228', regionLabel: 'Region' },
    { code: 'TO', name: 'Tonga', flag: '🇹🇴', dial: '+676', regionLabel: 'Division' },
    { code: 'TT', name: 'Trinidad & Tobago', flag: '🇹🇹', dial: '+1', regionLabel: 'Region' },
    { code: 'TN', name: 'Tunisia', flag: '🇹🇳', dial: '+216', regionLabel: 'Governorate' },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷', dial: '+90', regionLabel: 'Province' },
    { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', dial: '+993', regionLabel: 'Region' },
    { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', dial: '+688', regionLabel: 'Island' },
    { code: 'UG', name: 'Uganda', flag: '🇺🇬', dial: '+256', regionLabel: 'District' },
    { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dial: '+380', regionLabel: 'Oblast' },
    {
        code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '+971', regionLabel: 'Emirate',
        regions: ['Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain']
    },
    {
        code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44', regionLabel: 'Country/Region',
        regions: ['England', 'Scotland', 'Wales', 'Northern Ireland']
    },
    {
        code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1', regionLabel: 'State',
        regions: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia']
    },
    { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dial: '+598', regionLabel: 'Department' },
    { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', dial: '+998', regionLabel: 'Region' },
    { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', dial: '+678', regionLabel: 'Province' },
    { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dial: '+58', regionLabel: 'State' },
    { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dial: '+84', regionLabel: 'Province' },
    { code: 'YE', name: 'Yemen', flag: '🇾🇪', dial: '+967', regionLabel: 'Governorate' },
    { code: 'ZM', name: 'Zambia', flag: '🇿🇲', dial: '+260', regionLabel: 'Province' },
    { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dial: '+263', regionLabel: 'Province' },
];

/** Lookup a country by ISO code */
export function getCountry(code) {
    return COUNTRIES.find((c) => c.code === code) || null;
}

/** True if the country has a known regions list */
export function hasRegions(code) {
    const c = getCountry(code);
    return !!(c?.regions?.length);
}

/** Return sorted list of regions for a country, or empty array */
export function getRegions(code) {
    return getCountry(code)?.regions || [];
}

/** Default country code — detected from browser locale, falls back to ZA */
export function detectDefaultCountry() {
    try {
        const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        // Rough timezone → country heuristic for common cases
        if (tz.includes('Johannesburg') || tz.includes('Africa/Jo')) return 'ZA';
        if (tz.includes('America/New_York') || tz.includes('America/Chicago') || tz.includes('America/Los_Angeles')) return 'US';
        if (tz.includes('Europe/London')) return 'GB';
        if (tz.includes('Australia/')) return 'AU';
        if (tz.includes('Africa/Nairobi')) return 'KE';
        if (tz.includes('Africa/Lagos')) return 'NG';
        if (tz.includes('Asia/Kolkata')) return 'IN';
        if (tz.includes('Europe/Berlin') || tz.includes('Europe/Paris')) return 'DE';
        // Fallback: South Africa (original app base)
        return 'ZA';
    } catch {
        return 'ZA';
    }
}