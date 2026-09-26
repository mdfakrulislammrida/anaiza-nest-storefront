export const BD_DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
] as const;

export type BdDivision = (typeof BD_DIVISIONS)[number];

export const BD_DISTRICTS_BY_DIVISION: Record<BdDivision, string[]> = {
  Dhaka: [
    "Dhaka",
    "Faridpur",
    "Gazipur",
    "Gopalganj",
    "Kishoreganj",
    "Madaripur",
    "Manikganj",
    "Munshiganj",
    "Narayanganj",
    "Narsingdi",
    "Rajbari",
    "Shariatpur",
    "Tangail",
  ],
  Chattogram: [
    "Bandarban",
    "Brahmanbaria",
    "Chandpur",
    "Chattogram",
    "Cumilla",
    "Cox's Bazar",
    "Feni",
    "Khagrachhari",
    "Lakshmipur",
    "Noakhali",
    "Rangamati",
  ],
  Rajshahi: [
    "Bogura",
    "Joypurhat",
    "Naogaon",
    "Natore",
    "Chapainawabganj",
    "Pabna",
    "Rajshahi",
    "Sirajganj",
  ],
  Khulna: [
    "Bagerhat",
    "Chuadanga",
    "Jashore",
    "Jhenaidah",
    "Khulna",
    "Kushtia",
    "Magura",
    "Meherpur",
    "Narail",
    "Satkhira",
  ],
  Barishal: ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  Sylhet: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
  Rangpur: [
    "Dinajpur",
    "Gaibandha",
    "Kurigram",
    "Lalmonirhat",
    "Nilphamari",
    "Panchagarh",
    "Rangpur",
    "Thakurgaon",
  ],
  Mymensingh: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
};

// Upazila (thana) data sourced from the community-maintained
// github.com/nuhil/bangladesh-geocode dataset (494 upazilas across all 64
// districts). Four district names in that dataset use older spellings than
// this app's own district list above (Comilla/Cumilla, Coxsbazar/Cox's
// Bazar, Barisal/Barishal, Jhalakathi/Jhalokati -- official Bangladeshi
// renamings) -- the upazilas below are keyed by this app's existing names
// so they join directly against BD_DISTRICTS_BY_DIVISION.
//
// Dhaka district is a special case: most of it is Dhaka City, which isn't
// subdivided into upazilas at all -- residents identify by police-station
// "thana" (Gulshan, Banani, Dhanmondi, Mirpur, Uttara, etc.), a completely
// different naming system than the rest of the country's rural upazilas.
// The generic upazila dataset above only has Dhaka district's 5 genuinely
// rural upazilas (Dhamrai, Dohar, Keraniganj, Nawabganj, Savar) and knows
// nothing about the city thanas most customers actually need. Those 50
// thanas below are Dhaka Metropolitan Police's official current list
// (en.wikipedia.org/wiki/Dhaka_Metropolitan_Police, cross-checked against
// Bangladesh Post Office's postal-thana data, which independently confirms
// the same names, e.g. "Tejgaon Industrial Area"). Two edits from the
// source list: "Jattrabari" -> "Jatrabari" (typo, per the postal data) and
// dropped the bureaucratic "Model" qualifier from three thana names
// (Mirpur, Ramna, Paltan) where nothing else collides with the shorter
// form; kept "Tejgaon Industrial Area" distinct from "Tejgaon" since both
// are real, separate thanas.
const DHAKA_METRO_THANAS = [
  "Adabor", "Airport", "Badda", "Banani", "Bangshal", "Bhashantek", "Cantonment",
  "Chackbazar", "Dakshin Khan", "Darus-Salam", "Demra", "Dhanmondi", "Gandaria",
  "Gulshan", "Hatirjheel", "Hazaribagh", "Jatrabari", "Kadamtoli", "Kafrul",
  "Kalabagan", "Kamrangirchar", "Khilgaon", "Khilkhet", "Kotwali", "Lalbagh",
  "Mirpur", "Mohammadpur", "Motijheel", "Mugda", "New Market", "Pallabi",
  "Paltan", "Ramna", "Rampura", "Rupnagar", "Sabujbag", "Shah Ali", "Shahbag",
  "Shahjahanpur", "Sher-e-Bangla Nagar", "Shyampur", "Sutrapur", "Tejgaon",
  "Tejgaon Industrial Area", "Turag", "Uttar Khan", "Uttara East",
  "Uttara West", "Vatara", "Wari",
];

export const BD_UPAZILAS_BY_DISTRICT: Record<string, string[]> = {
  "Bagerhat": ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
  "Bandarban": ["Alikadam", "Bandarban Sadar", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"],
  "Barguna": ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Pathorghata", "Taltali"],
  "Barishal": ["Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Barisal Sadar", "Gournadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
  "Bhola": ["Bhola Sadar", "Borhan Sddin", "Charfesson", "Doulatkhan", "Lalmohan", "Monpura", "Tazumuddin"],
  "Bogura": ["Adamdighi", "Bogra Sadar", "Dhunot", "Dupchanchia", "Gabtali", "Kahaloo", "Nondigram", "Shajahanpur", "Shariakandi", "Sherpur", "Shibganj", "Sonatala"],
  "Brahmanbaria": ["Akhaura", "Ashuganj", "Bancharampur", "Bijoynagar", "Brahmanbaria Sadar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail"],
  "Chandpur": ["Chandpur Sadar", "Faridgonj", "Haimchar", "Hajiganj", "Kachua", "Matlab North", "Matlab South", "Shahrasti"],
  "Chapainawabganj": ["Bholahat", "Chapainawabganj Sadar", "Gomostapur", "Nachol", "Shibganj"],
  "Chattogram": ["Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Fatikchhari", "Hathazari", "Karnafuli", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda"],
  "Chuadanga": ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"],
  "Cox's Bazar": ["Chakaria", "Coxsbazar Sadar", "Eidgaon", "Kutubdia", "Moheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhiya"],
  "Cumilla": ["Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Comilla Sadar", "Daudkandi", "Debidwar", "Homna", "Laksam", "Lalmai", "Meghna", "Monohargonj", "Muradnagar", "Nangalkot", "Sadarsouth", "Titas"],
  // City thanas plus the district's genuinely rural upazilas -- see
  // DHAKA_METRO_THANAS above for why Dhaka needs both.
  "Dhaka": [...DHAKA_METRO_THANAS, "Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar"].sort(),
  "Dinajpur": ["Birampur", "Birganj", "Birol", "Bochaganj", "Chirirbandar", "Dinajpur Sadar", "Fulbari", "Ghoraghat", "Hakimpur", "Kaharol", "Khansama", "Nawabganj", "Parbatipur"],
  "Faridpur": ["Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Faridpur Sadar", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha"],
  "Feni": ["Chhagalnaiya", "Daganbhuiyan", "Feni Sadar", "Fulgazi", "Parshuram", "Sonagazi"],
  "Gaibandha": ["Gaibandha Sadar", "Gobindaganj", "Palashbari", "Phulchari", "Sadullapur", "Saghata", "Sundarganj"],
  "Gazipur": ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur"],
  "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
  "Habiganj": ["Ajmiriganj", "Bahubal", "Baniachong", "Chunarughat", "Habiganj Sadar", "Lakhai", "Madhabpur", "Nabiganj"],
  "Jamalpur": ["Bokshiganj", "Dewangonj", "Islampur", "Jamalpur Sadar", "Madarganj", "Melandah", "Sarishabari"],
  "Jashore": ["Abhaynagar", "Bagherpara", "Chougachha", "Jessore Sadar", "Jhikargacha", "Keshabpur", "Manirampur", "Sharsha"],
  "Jhalokati": ["Jhalakathi Sadar", "Kathalia", "Nalchity", "Rajapur"],
  "Jhenaidah": ["Harinakundu", "Jhenaidah Sadar", "Kaliganj", "Kotchandpur", "Moheshpur", "Shailkupa"],
  "Joypurhat": ["Akkelpur", "Joypurhat Sadar", "Kalai", "Khetlal", "Panchbibi"],
  "Khagrachhari": ["Dighinala", "Guimara", "Khagrachhari Sadar", "Laxmichhari", "Manikchari", "Matiranga", "Mohalchari", "Panchari", "Ramgarh"],
  "Khulna": ["Botiaghata", "Dakop", "Digholia", "Dumuria", "Fultola", "Koyra", "Paikgasa", "Rupsha", "Terokhada"],
  "Kishoreganj": ["Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimgonj", "Katiadi", "Kishoreganj Sadar", "Kuliarchar", "Mithamoin", "Nikli", "Pakundia", "Tarail"],
  "Kurigram": ["Bhurungamari", "Charrajibpur", "Chilmari", "Kurigram Sadar", "Nageshwari", "Phulbari", "Rajarhat", "Rowmari", "Ulipur"],
  "Kushtia": ["Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Kushtia Sadar", "Mirpur"],
  "Lakshmipur": ["Kamalnagar", "Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati"],
  "Lalmonirhat": ["Aditmari", "Hatibandha", "Kaliganj", "Lalmonirhat Sadar", "Patgram"],
  "Madaripur": ["Dasar", "Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar"],
  "Magura": ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
  "Manikganj": ["Doulatpur", "Gior", "Harirampur", "Manikganj Sadar", "Saturia", "Shibaloy", "Singiar"],
  "Meherpur": ["Gangni", "Meherpur Sadar", "Mujibnagar"],
  "Moulvibazar": ["Barlekha", "Juri", "Kamolganj", "Kulaura", "Moulvibazar Sadar", "Rajnagar", "Sreemangal"],
  "Munshiganj": ["Gajaria", "Louhajanj", "Munshiganj Sadar", "Sirajdikhan", "Sreenagar", "Tongibari"],
  "Mymensingh": ["Bhaluka", "Dhobaura", "Fulbaria", "Gafargaon", "Gouripur", "Haluaghat", "Iswarganj", "Muktagacha", "Mymensingh Sadar", "Nandail", "Phulpur", "Tarakanda", "Trishal"],
  "Naogaon": ["Atrai", "Badalgachi", "Dhamoirhat", "Manda", "Mohadevpur", "Naogaon Sadar", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"],
  "Narail": ["Kalia", "Lohagara", "Narail Sadar"],
  "Narayanganj": ["Araihazar", "Bandar", "Narayanganj Sadar", "Rupganj", "Sonargaon"],
  "Narsingdi": ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Raipura", "Shibpur"],
  "Natore": ["Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Naldanga", "Natore Sadar", "Singra"],
  "Netrokona": ["Atpara", "Barhatta", "Durgapur", "Kalmakanda", "Kendua", "Khaliajuri", "Madan", "Mohongonj", "Netrokona Sadar", "Purbadhala"],
  "Nilphamari": ["Dimla", "Domar", "Jaldhaka", "Kishorganj", "Nilphamari Sadar", "Syedpur"],
  "Noakhali": ["Begumganj", "Chatkhil", "Companiganj", "Hatia", "Kabirhat", "Noakhali Sadar", "Senbug", "Sonaimori", "Subarnachar"],
  "Pabna": ["Atghoria", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishurdi", "Pabna Sadar", "Santhia", "Sujanagar"],
  "Panchagarh": ["Atwari", "Boda", "Debiganj", "Panchagarh Sadar", "Tetulia"],
  "Patuakhali": ["Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj", "Patuakhali Sadar", "Rangabali"],
  "Pirojpur": ["Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Pirojpur Sadar", "Zianagar"],
  "Rajbari": ["Baliakandi", "Goalanda", "Kalukhali", "Pangsa", "Rajbari Sadar"],
  "Rajshahi": ["Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohonpur", "Paba", "Puthia", "Tanore"],
  "Rangamati": ["Baghaichari", "Barkal", "Belaichari", "Juraichari", "Kaptai", "Kawkhali", "Langadu", "Naniarchar", "Rajasthali", "Rangamati Sadar"],
  "Rangpur": ["Badargonj", "Gangachara", "Kaunia", "Mithapukur", "Pirgacha", "Pirgonj", "Rangpur Sadar", "Taragonj"],
  "Satkhira": ["Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Satkhira Sadar", "Shyamnagar", "Tala"],
  "Shariatpur": ["Bhedarganj", "Damudya", "Gosairhat", "Naria", "Shariatpur Sadar", "Zajira"],
  "Sherpur": ["Jhenaigati", "Nalitabari", "Nokla", "Sherpur Sadar", "Sreebordi"],
  "Sirajganj": ["Belkuchi", "Chauhali", "Kamarkhand", "Kazipur", "Raigonj", "Shahjadpur", "Sirajganj Sadar", "Tarash", "Ullapara"],
  "Sunamganj": ["Bishwambarpur", "Chhatak", "Derai", "Dharmapasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Madhyanagar", "Shalla", "South Sunamganj", "Sunamganj Sadar", "Tahirpur"],
  "Sylhet": ["Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Dakshinsurma", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmaninagar", "Sylhet Sadar", "Zakiganj"],
  "Tangail": ["Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"],
  "Thakurgaon": ["Baliadangi", "Haripur", "Pirganj", "Ranisankail", "Thakurgaon Sadar"],
};
