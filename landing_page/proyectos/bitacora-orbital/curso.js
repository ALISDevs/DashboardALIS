(() => {
  const choice = (prompt, options, answer, explanation) =>
    ({ type: "choice", prompt, options, accepted: [answer], explanation });
  const write = (prompt, accepted, explanation, mistakes) =>
    ({ type: "write", prompt, accepted, explanation, mistakes });
  const order = (prompt, words, answer, explanation) =>
    ({ type: "order", prompt, words, accepted: [answer], explanation });

  const course = {
    origenes: {
      coach: "Mara",
      notes: [
        ["Presentarte", "Usa am con I, is con he, she o un nombre singular y are con you, we o they. Las formas cortas incluyen I'm, he's, she's, you're, we're y they're.", "I’m from Mexico. She’s from Russia. They’re teammates."],
        ["Preguntar por el origen", "Para preguntar de dónde es alguien, usa Where + am/is/are + sujeto + from? From introduce el lugar. La nacionalidad se usa después de be sin from.", "Where is Leo from? He’s from Mexico. He’s Mexican."],
        ["Identificar a quién pertenece algo", "My corresponde a I, your a you, his a he, her a she, our a we y their a they. Van antes del sustantivo y dependen de quién posee o de quién hablamos.", "My colleague is Mara. Is he your teammate? Nora Vidal is their boss."],
        ["Países y personas", "United States → American. Russia → Russian. Mexico → Mexican. Teammate significa compañero de equipo, colleague significa colega y boss significa jefe.", "Nina is Russian. Alex is American. They’re teammates."],
      ],
      reading: {
        title: "Registro de llegada",
        passage: "Leo and Mara are from Mexico. Leo is a trainee. He is Mexican. Mara is his sister. Alex Chen and Nina Moroz are crew members. Alex is from the United States, and Nina is from Russia. They are teammates. Nora Vidal is their boss.",
        questions: [
          choice("Where is Leo from?", ["Mexico", "Russia", "The United States"], "Mexico", "El expediente dice que Leo y Mara son de México. From introduce el lugar de origen."),
          choice("Who is their boss?", ["Mara", "Nora Vidal", "Alex Chen"], "Nora Vidal", "Their se refiere a Alex y Nina, los compañeros de equipo. El expediente identifica a Nora Vidal como su jefa."),
        ],
      },
      writing: {
        questions: [
          write("Mara: I ___ from Mexico. Completa con el verbo.", ["am"], "Con I usamos am. Juntos se pueden contraer como I’m, pero aquí I ya aparece escrito."),
          write("Inés is a teammate. This is ___ badge. Escribe el posesivo de Inés.", ["her"], "Her indica que la credencial es de Inés. El posesivo depende de Inés, aunque badge sea una cosa.", [
            { response: "his", explanation: "His corresponde a he. Inés usa she en este diálogo, así que la credencial es her badge." },
            { response: "their", explanation: "Their corresponde a they. Aquí la credencial pertenece a una sola persona, Inés, por eso usamos her." },
          ]),
          order("Ordena la pregunta de origen.", ["from?", "Leo", "Where", "is"], "Where is Leo from?", "En esta pregunta va primero Where, después is, el sujeto Leo y al final from."),
          write("Reescribe con una contracción: They are teammates.", ["They’re teammates.", "They’re teammates"], "They are se contrae como they’re. El apóstrofo marca las letras que se omiten."),
        ],
      },
      listening: {
        title: "Registro de agentes",
        speaker: "Centro de comunicaciones",
        transcript: "Hello, agents. This is a team report. Alex is from the United States. He is American. Nina is from Russia. She is Russian. They are teammates. Nora Vidal is their boss.",
        questions: [
          choice("Where is Nina from?", ["The United States", "Mexico", "Russia"], "Russia", "El reporte dice Nina is from Russia. Russian es la nacionalidad y Russia es el país."),
          choice("What is Alex’s nationality?", ["American", "Mexican", "Russian"], "American", "El reporte dice He is American después de presentar a Alex. Esa frase indica su nacionalidad."),
        ],
      },
      exam: {
        title: "Operación Identidad",
        passage: "Mission log: Mara and Leo are Mexican. Alex is American. Alex and Nina are teammates, and Nora Vidal is their boss.",
        questions: [
          choice("Según el expediente, ¿quiénes son de México?", ["Alex and Nina", "Mara and Leo", "Nora Vidal and Alex"], "Mara and Leo", "Mexican es la nacionalidad. El expediente usa are Mexican para Mara y Leo."),
          write("Completa: You ___ my colleague.", ["are"], "Con you usamos are incluso cuando hablamos con una sola persona."),
          write("Completa: Mara and I are teammates. This is ___ team.", ["our"], "Mara and I equivale a we, así que el posesivo correspondiente es our."),
          order("Ordena la pregunta para Nina.", ["Nina", "from?", "Where", "is"], "Where is Nina from?", "La pregunta empieza con Where y el verbo is va delante del sujeto Nina."),
          write("Contrae la oración: He is from Mexico.", ["He’s from Mexico.", "He’s from Mexico"], "He is se contrae como he’s. From Mexico se conserva para indicar el origen."),
          write("Completa: Leo is a teammate. This is ___ badge.", ["his"], "La credencial pertenece a Leo. Para he, el posesivo delante del sustantivo es his."),
          write("Nora Vidal dice: I’m Nora. This is ___ badge.", ["my"], "Nora habla de su propia credencial. Con I usamos my delante de badge."),
          write("Mara pregunta a Alex: Is this ___ badge?", ["your"], "Mara se dirige a Alex con you. Your indica que pregunta si la credencial le pertenece a él."),
          write("Alex y Nina tienen una jefa. Completa: Nora Vidal is ___ boss.", ["their"], "Alex and Nina equivale a they. El adjetivo posesivo correspondiente es their."),
          choice("Escoge la contracción correcta de We are teammates.", ["We’s teammates.", "We’re teammates.", "We’am teammates."], "We’re teammates.", "Con we usamos are. La contracción de we are es we’re."),
        ],
      },
    },
    lugares: {
      coach: "Mara Reyes",
      notes: [
        ["Ubicar dos lugares", "Next to significa al lado de. Across the street from significa enfrente, al otro lado de la calle. Usa from cuando nombras el lugar de referencia.", "The observatory is next to the pizza shop. The bank is across the street from the school."],
        ["Seguir una calle", "Down the street significa más adelante por la calle. Between va con dos referencias unidas por and.", "The station is down the street. The pharmacy is between the bank and the school."],
        ["Lugares y transporte", "Bank es banco, pharmacy es farmacia y school es escuela. Motorcycle es motocicleta, train es tren y spaceship es nave espacial. Aquí shuttle se refiere al minibús de la tripulación.", "Alex has a motorcycle. The train is at the station."],
      ],
      reading: {
        title: "Mapa de entrenamiento del observatorio",
        passage: "The observatory is next to the pizza shop. The bank is across the street from the observatory. The pharmacy is between the bank and the school. The train station is down the street.",
        questions: [
          choice("What is next to the observatory?", ["The school", "The pizza shop", "The train station"], "The pizza shop", "Next to significa al lado de. Según este mapa, el observatorio está junto a la pizzería."),
          choice("Where is the train station?", ["Down the street", "Between the bank and the school", "Across the street from the observatory"], "Down the street", "Down the street indica que debes seguir por la misma calle. La farmacia es la que está entre el banco y la escuela."),
        ],
      },
      writing: {
        questions: [
          write("Completa con «al lado de»: The shuttle is ___ the school.", ["next to"], "Next to va antes de la referencia y significa al lado de."),
          order("Ordena la ubicación de la farmacia.", ["the bank", "is", "and the school.", "The pharmacy", "between"], "The pharmacy is between the bank and the school.", "Between va antes de dos referencias, unidas por and."),
          write("Completa con «al otro lado de la calle de»: The bank is ___ the observatory.", ["across the street from"], "Across the street indica el otro lado de la calle. Añadimos from antes del lugar de referencia, the observatory."),
        ],
      },
      listening: {
        title: "Reporte de transporte",
        speaker: "Alex Chen",
        transcript: "Hi, crew. My motorcycle is next to the bank. The train is at the station. The station is down the street. The shuttle is next to the school. The spaceship is across the street from the school.",
        questions: [
          choice("What is next to the bank?", ["The spaceship", "The shuttle", "Alex’s motorcycle"], "Alex’s motorcycle", "Alex dice My motorcycle is next to the bank. My indica que la motocicleta es suya."),
          choice("Where is the spaceship?", ["Across the street from the school", "Next to the bank", "At the train station"], "Across the street from the school", "El reporte distingue entre el shuttle, que está al lado de la escuela, y la nave, que está enfrente."),
        ],
      },
      exam: {
        title: "Ruta al observatorio",
        passage: "At the training site, the motorcycle is between the bank and the pharmacy. The school is across the street from the observatory. The train station is down the street. The shuttle is next to the school.",
        questions: [
          choice("What is between the bank and the pharmacy?", ["The shuttle", "The motorcycle", "The train station"], "The motorcycle", "El reporte coloca la motocicleta entre el banco y la farmacia."),
          write("Completa: The station is ___ the street. Está más adelante.", ["down"], "Down the street indica una ubicación más adelante por esa calle."),
          write("Completa con «al lado de»: The shuttle is ___ the school.", ["next to"], "Next to indica que las dos cosas están una al lado de la otra."),
          order("Ordena dónde está la escuela.", ["is", "the observatory.", "The school", "across the street", "from"], "The school is across the street from the observatory.", "La referencia sigue a across the street from. La escuela está al otro lado de la calle, frente al observatorio."),
          choice("En el expediente, ¿qué palabra significa farmacia?", ["Bank", "School", "Pharmacy"], "Pharmacy", "Pharmacy significa farmacia. Bank y school significan banco y escuela."),
        ],
      },
    },
    familia: {
      coach: "Hugo",
      notes: [
        ["Leer el árbol familiar", "Father es padre y mother es madre. Parents se refiere a los padres en conjunto. Son y daughter son hijo e hija. Children es el plural irregular de child.", "Nico is Hugo’s father. Nico and Elena are his parents."],
        ["Reconocer parentescos", "Brother es hermano, sister es hermana, wife es esposa y husband es esposo. Puedes usar his o her antes de estas palabras para señalar de quién hablas.", "Lia is Hugo’s sister. Hugo is Lia’s brother. Nico is Elena’s husband."],
        ["Formar los números", "Las decenas son twenty, thirty, forty, fifty, sixty, seventy, eighty y ninety. Entre decenas, une la decena y la unidad con un guion. Para 100 usa one hundred y para 101 puedes usar one hundred and one o one hundred one.", "21 = twenty-one. 47 = forty-seven. 99 = ninety-nine. 101 = one hundred and one."],
      ],
      reading: {
        title: "Árbol de la familia Vale",
        passage: "Nico is Hugo's father. Elena is Hugo's mother. Nico is Elena's husband. Elena is Nico's wife. Lia is Hugo's sister. Hugo and Lia are their children. The family file is number twenty-one.",
        questions: [
          choice("Who is Nico’s wife?", ["Elena", "Lia", "Hugo"], "Elena", "El expediente dice Elena is Nico’s wife. Wife significa esposa."),
          choice("What is the family file number?", ["12", "20", "21"], "21", "Twenty-one combina twenty (20) y one (1), así que el expediente es el número 21."),
        ],
      },
      writing: {
        questions: [
          write("Completa: Lia is Hugo’s ___.", ["sister"], "Lia es hermana de Hugo. Sister significa hermana y brother significa hermano."),
          write("Escribe 47 en inglés con guion.", ["forty-seven"], "Forty significa 40 y seven significa 7. Forty se escribe sin u."),
          order("Ordena la oración del expediente.", ["their", "Hugo and Lia", "children.", "are"], "Hugo and Lia are their children.", "Hugo and Lia son el sujeto plural, por eso se usa are. Children es el plural de child."),
        ],
      },
      listening: {
        title: "Archivo de la familia Vale",
        speaker: "Hugo",
        transcript: "My father is Nico. My mother is Elena. They are my parents. Lia is my sister. The file for my parents is number thirty-two. My sister's file is number one hundred and one.",
        questions: [
          choice("Who are Hugo’s parents?", ["Nico and Lia", "Elena and Nico", "Elena and Lia"], "Elena and Nico", "Hugo identifica a Nico como su padre y a Elena como su madre. Los dos son sus parents."),
          choice("What is Lia’s file number?", ["32", "100", "101"], "101", "One hundred and one significa 101. El número 32 corresponde al expediente de los padres."),
        ],
      },
      exam: {
        title: "Archivo familiar",
        passage: "Elena is Nico’s wife. Hugo and Lia are their children. The children’s file is number ninety-six. The parents’ file is number one hundred.",
        questions: [
          write("Completa: Nico is Elena’s ___.", ["husband"], "Husband significa esposo. Si Elena es la esposa de Nico, Nico es su esposo."),
          choice("¿Qué número corresponde a los hijos en este expediente?", ["69", "96", "100"], "96", "Ninety-six se compone de ninety (90) y six (6)."),
          write("Escribe 58 en inglés con guion.", ["fifty-eight"], "Fifty es 50. La combinación con eight (8) se escribe fifty-eight."),
          write("Escribe 101 en palabras.", ["one hundred and one", "one hundred one", "a hundred and one", "a hundred one"], "One hundred es 100. Agrega one para llegar a 101. And es válido, y también puedes omitirlo."),
          order("Ordena la oración sobre los padres de Hugo.", ["his", "Nico and Elena", "parents.", "are"], "Nico and Elena are his parents.", "Nico and Elena es el sujeto plural. Are va antes de his parents."),
        ],
      },
    },
    apariencia: {
      coach: "Alma",
      notes: [
        ["Cabello", "Straight significa lacio, wavy significa ondulado y curly significa rizado. Pon la textura o el color antes de hair. Hair se usa en singular al hablar del cabello en general.", "Alma has white hair. She has wavy hair in this illustration."],
        ["Partes de la cara", "Eyes son los ojos, chin es la barbilla y mouth es la boca. Beard significa barba. El color va antes del rasgo.", "Ren has a beard. Dax has brown eyes."],
        ["Decir qué rasgos tiene alguien", "Para describir a una sola persona con he o she, usa has. Con I, you, we y they usa have.", "He has brown eyes. They have brown eyes."],
      ],
      reading: {
        title: "Perfiles de la sala de entrenamiento",
        passage: "The new crew profiles are ready. Alma has wavy white hair. Ren has black hair and a beard. Dax has brown eyes and a wide mouth. The trainee has straight brown hair and blue eyes.",
        questions: [
          choice("Who has wavy white hair?", ["The agent", "Alma", "Ren"], "Alma", "Wavy describe la textura ondulada y white indica el color. Los dos adjetivos describen el cabello de Alma."),
          choice("What color are Dax’s eyes?", ["Brown", "Blue", "Green"], "Brown", "El expediente dice Dax has brown eyes. Blue describe los ojos de la persona en formación."),
        ],
      },
      writing: {
        questions: [
          write("Completa con «lacio»: The agent has ___ hair.", ["straight"], "Straight significa lacio. Wavy significa ondulado y curly significa rizado."),
          write("Completa con «barbilla»: Ren has a strong ___.", ["chin"], "Chin significa barbilla. Mouth es la boca y beard es la barba."),
          order("Ordena la descripción de Alma.", ["white", "Alma", "hair.", "has"], "Alma has white hair.", "Alma es una persona, así que usamos has. White va delante de hair."),
        ],
      },
      listening: {
        title: "Escaneo de rasgos",
        speaker: "Centro de comunicaciones",
        transcript: "Agent one has curly brown hair and green eyes. Agent two has straight black hair and blue eyes. Ren has a beard. Dax has a wide mouth.",
        questions: [
          choice("Which agent has curly hair?", ["Agent one", "Agent two", "Ren"], "Agent one", "El reporte empieza con Agent one has curly brown hair. Curly indica cabello rizado."),
          choice("What color are agent two’s eyes?", ["Green", "Brown", "Blue"], "Blue", "Blue eyes corresponde al segundo agente. Black describe su cabello."),
        ],
      },
      exam: {
        title: "Identificación visual",
        passage: "Alma has white hair and brown eyes in the new profile. The trainee next to her has curly black hair, green eyes and a small mouth.",
        questions: [
          choice("En este expediente, ¿quién tiene cabello negro y rizado?", ["Dax", "The trainee", "Alma"], "The trainee", "Curly black hair describe al aprendiz. White hair corresponde a Alma."),
          write("Completa con el verbo: Ren ___ a beard.", ["has"], "Con Ren, un sujeto singular que equivale a he, usamos has."),
          write("Completa con «ojos»: Alma has brown ___.", ["eyes"], "Eyes es el plural de eye. Brown eyes describe los dos ojos."),
          order("Ordena la descripción de Dax.", ["brown", "has", "eyes.", "Dax"], "Dax has brown eyes.", "Dax va primero, seguido de has y brown eyes. El color va antes de eyes."),
          choice("¿Qué significa mouth?", ["Barba", "Boca", "Barbilla"], "Boca", "Mouth significa boca. Beard es barba y chin es barbilla."),
        ],
      },
    },
    ropa: {
      coach: "Iris Sol",
      notes: [
        ["Describir ropa", "Suit es traje, shirt es camisa, jacket es chaqueta y shoes significa zapatos. Coloca los colores antes de la prenda.", "Iris has a blue and orange suit. Nina has black shoes."],
        ["Decir la hora", "Usa o’clock en punto. Quarter after indica quince minutos después de la hora. Half past indica treinta minutos después de la hora.", "3:00 = three o’clock. 3:15 = quarter after three. 3:30 = half past three."],
        ["Hablar de un evento", "Usa at para decir a qué hora sucede un evento. La hora va después de at.", "The briefing is at half past six."],
      ],
      reading: {
        title: "Agenda del Hangar Vector",
        passage: "Iris Sol has a blue and orange suit. Nina has a black jacket and black shoes. Alex has a blue shirt. The suit test is at four o'clock. The team meeting is at quarter after four. The docking drill is at half past four.",
        questions: [
          choice("What color is Iris’s suit?", ["Black and blue", "Blue and orange", "Blue and gold"], "Blue and orange", "El expediente describe el traje como a blue and orange suit. Los dos colores aparecen antes de suit."),
          choice("What time is the team meeting?", ["4:00", "4:15", "4:30"], "4:15", "Quarter after four significa quince minutos después de las cuatro."),
        ],
      },
      writing: {
        questions: [
          write("Completa con «chaqueta»: Nina has a black ___.", ["jacket"], "Jacket significa chaqueta. Shirt es camisa y suit es traje."),
          write("Escribe 7:30 en inglés usando past.", ["half past seven"], "Half past seven significa media hora después de las siete."),
          order("Ordena el horario de la prueba.", ["at", "four o’clock.", "The suit test", "is"], "The suit test is at four o’clock.", "Para un evento usa The suit test is at y luego la hora. O’clock indica que es en punto."),
        ],
      },
      listening: {
        title: "Aviso de vestuario",
        speaker: "Centro de comunicaciones",
        transcript: "The training session is at six o'clock. The suit test is at quarter after six. The briefing is at half past six. Iris has a blue and orange suit. Alex has a blue jacket and brown shoes.",
        questions: [
          choice("What time is the suit test?", ["6:30", "6:00", "6:15"], "6:15", "El reporte dice quarter after six para la prueba del traje, así que empieza a las seis y cuarto."),
          choice("What color are Alex’s shoes?", ["Brown", "Blue", "Gold"], "Brown", "Brown shoes describe los zapatos de Alex. Blue describe su chaqueta."),
        ],
      },
      exam: {
        title: "Cuenta regresiva del hangar",
        passage: "Ada has a white shirt and a black jacket. The briefing is at five o’clock. The suit test is at half past five.",
        questions: [
          choice("What does Ada wear in the report?", ["A white jacket", "A black shirt", "A black jacket"], "A black jacket", "El texto dice white shirt y black jacket. Shirt es camisa y jacket es chaqueta."),
          choice("What time is the suit test?", ["5:00", "5:15", "5:30"], "5:30", "Half past five significa cinco y media. Five o’clock es la hora de la reunión."),
          write("Escribe 8:15 con quarter after.", ["quarter after eight", "a quarter after eight"], "Quarter after eight significa quince minutos después de las ocho."),
          order("Ordena: La reunión es a las cinco en punto.", ["five o’clock.", "The briefing", "at", "is"], "The briefing is at five o’clock.", "At introduce la hora de la reunión y five o’clock significa cinco en punto."),
          write("Completa con «zapatos»: Alex has brown ___.", ["shoes"], "Shoes significa zapatos. Brown va antes del nombre de la prenda."),
        ],
      },
    },
    casas: {
      coach: "Lina",
      notes: [
        ["Habitaciones", "Living room es sala, bedroom es dormitorio y kitchen es cocina. Usa in para decir que algo está dentro de una habitación.", "The sofa is in the living room. The bed is in the bedroom."],
        ["Muebles", "Furniture significa muebles en general. Sofa es sofá, table es mesa, chair es silla, desk es escritorio y bed es cama.", "The table and chairs are in the kitchen."],
        ["Electrodomésticos", "Appliances son electrodomésticos. Fridge es refrigerador, oven es horno y microwave es microondas.", "The fridge is in the kitchen. The microwave is next to the oven."],
      ],
      reading: {
        title: "Recorrido por el Módulo Umbral",
        passage: "The living room is next to the kitchen. The sofa is in the living room. The fridge and the oven are in the kitchen. The bedroom is down the hall. The bed and the desk are in the bedroom.",
        questions: [
          choice("Where is the sofa?", ["In the bedroom", "In the kitchen", "In the living room"], "In the living room", "Sofa significa sofá y el reporte lo ubica en la sala, the living room."),
          choice("What is in the kitchen?", ["The fridge and the oven", "The bed and the desk", "The sofa and the desk"], "The fridge and the oven", "El texto ubica el refrigerador y el horno en la cocina. Ambos son appliances."),
        ],
      },
      writing: {
        questions: [
          write("Completa con «dormitorio»: The bed is in the ___.", ["bedroom"], "Bedroom significa dormitorio. Living room es la sala y kitchen es la cocina."),
          write("Completa con «escritorio»: The ___ is next to the bed.", ["desk"], "Desk es escritorio, un tipo de mueble. Bed significa cama."),
          order("Ordena la ubicación del microondas.", ["in", "the kitchen.", "The microwave", "is"], "The microwave is in the kitchen.", "Primero va el electrodoméstico, seguido de is in y la habitación."),
        ],
      },
      listening: {
        title: "Visita a la Estación Mirador",
        speaker: "Alma",
        transcript: "Welcome to Mirador Station. The sofa and the chairs are in the living room. The fridge and the microwave are in the kitchen. The bed and the desk are in the bedroom. The desk is next to the bed.",
        questions: [
          choice("Where are the chairs?", ["In the living room", "In the kitchen", "In the bedroom"], "In the living room", "Alma dice The sofa and the chairs are in the living room. Chairs significa sillas."),
          choice("What is next to the bed?", ["The sofa", "The desk", "The microwave"], "The desk", "El reporte termina diciendo que el escritorio está junto a la cama."),
        ],
      },
      exam: {
        title: "Inspección de la base",
        passage: "In this room report, the bed and the desk are in the bedroom. The sofa is in the living room. The table, oven and fridge are in the kitchen.",
        questions: [
          choice("Where is the desk?", ["In the bedroom", "In the living room", "In the kitchen"], "In the bedroom", "El expediente agrupa bed y desk en el bedroom. Desk significa escritorio."),
          write("Completa con «horno»: The ___ is in the kitchen.", ["oven"], "Oven significa horno. Fridge es refrigerador y microwave es microondas."),
          choice("¿Qué par del expediente son electrodomésticos?", ["The bed and the desk", "The oven and the fridge", "The table and the sofa"], "The oven and the fridge", "El horno y el refrigerador son appliances. El escritorio, la mesa y el sofá son furniture."),
          order("Ordena: El sofá está en la sala.", ["the living room.", "The sofa", "in", "is"], "The sofa is in the living room.", "Sofa es el sujeto singular. Después de is in va la habitación, the living room."),
          write("Completa con «mesa»: The ___ is in the kitchen.", ["table"], "Table significa mesa. Se trata de un mueble, aunque esté en la cocina."),
        ],
      },
    },
    endgame: {
      coach: "Nora Vidal",
      exam: {
        title: "Expedición Aurora",
        passScore: 80,
        passage: "Orbital expedition file. Mara and Alex are teammates. She is from Mexico. Alex is from the United States. Nora Vidal is their boss. The school is next to the pharmacy and across the street from the bank. The train station is down the street. Nico and Elena are Hugo’s parents. Their file is number seventy-four. In the field picture, Alma has wavy white hair and the new agent has curly brown hair and green eyes. Alex has a blue shirt and brown shoes. The desk is in the bedroom, and the sofa is in the living room.",
        audio: {
          title: "Último mensaje antes del despegue",
          speaker: "Centro de comunicaciones",
          transcript: "The briefing is at quarter after nine. The train is at the station. The shuttle is next to the school. Iris Sol has a blue and orange suit. The team meeting is at half past nine. At the base, the microwave and the fridge are in the kitchen.",
        },
        questions: [
          write("Mara se presenta. Contrae y completa la oración: I am from Mexico.", ["I’m from Mexico.", "I’m from Mexico"], "I am se contrae como I’m. From va antes de Mexico, el lugar de origen."),
          write("Según el expediente, Nora Vidal is ___ boss. Usa el posesivo de Mara y Alex.", ["their"], "Mara and Alex equivale a they. Their es su adjetivo posesivo delante de boss."),
          order("Ordena la ubicación de la escuela según el expediente.", ["from the bank.", "The school", "across the street", "is"], "The school is across the street from the bank.", "Across the street from introduce la referencia. En el expediente, la escuela está frente al banco."),
          choice("Escucha el audio. What is next to the school?", ["The train", "The shuttle", "The bank"], "The shuttle", "El mensaje dice The shuttle is next to the school. El tren está en la estación."),
          write("Según el expediente, ¿qué relación tienen Nico y Elena con Hugo? Completa: They are his ___.", ["parents"], "Nico y Elena son sus padres. Parents se refiere a ambos en conjunto."),
          write("Convierte el número del expediente de los padres de Hugo en cifras.", ["74"], "Seventy-four combina setenta y cuatro. Por eso corresponde a 74."),
          write("Completa con el adjetivo de textura del expediente: The new agent has ___ brown hair.", ["curly"], "Curly significa rizado. Wavy se usa para el cabello ondulado de Alma."),
          order("Describe los ojos del nuevo agente según el expediente.", ["eyes.", "has", "The new agent", "green"], "The new agent has green eyes.", "Con the new agent usamos has. Green describe el color y va delante de eyes."),
          write("Escucha el audio y escribe la hora de la reunión del equipo en inglés usando past.", ["half past nine"], "El mensaje dice The team meeting is at half past nine. Eso equivale a las nueve y media."),
          choice("Combina las fuentes. ¿Quién tiene zapatos cafés y quién tiene un traje azul y naranja?", ["Alex has brown shoes. Iris has a blue and orange suit.", "Iris has brown shoes. Alex has a blue and orange suit.", "Mara has brown shoes. Iris has a blue suit."], "Alex has brown shoes. Iris has a blue and orange suit.", "El expediente describe los zapatos de Alex. El reporte de voz describe el traje de Iris."),
          order("Según el expediente, ordena la ubicación del sofá.", ["in", "is", "the living room.", "The sofa"], "The sofa is in the living room.", "The sofa es el sujeto. Is in enlaza con la habitación, the living room."),
          choice("Escucha el audio. ¿Qué dos electrodomésticos están en la cocina?", ["The desk and the fridge", "The microwave and the sofa", "The microwave and the fridge"], "The microwave and the fridge", "El reporte ubica el microondas y el refrigerador en la cocina. Desk y sofa son muebles."),
        ],
      },
    },
  };

  globalThis.OrbitalCourse = course;
})();
