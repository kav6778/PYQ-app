"""
Subject and topic keyword dictionary for classifying questions extracted from
competitive exam PDFs (JEE, NEET, CAT, UPSC).
"""

SUBJECT_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "Maths": {
        "Calculus": [
            "integration", "differentiation", "derivative", "integral",
            "limit", "limits", "continuity", "differentiable", "antiderivative",
            "definite integral", "indefinite integral", "chain rule",
        ],
        "Algebra": [
            "matrix", "matrices", "determinant", "eigenvalue", "vector",
            "quadratic", "polynomial", "roots", "sequence", "series",
        ],
        "Probability & Statistics": [
            "probability", "permutation", "combination", "statistics",
            "mean", "median", "mode", "variance", "standard deviation",
            "random variable", "distribution",
        ],
        "Geometry": [
            "circle", "triangle", "parabola", "ellipse", "hyperbola",
            "coordinate", "conic section", "locus", "tangent", "normal",
            "straight line", "plane",
        ],
        "Trigonometry": [
            "trigonometry", "sine", "cosine", "tangent", "cot", "sec",
            "cosec", "angle", "radian", "inverse trigonometric",
        ],
        "General": [
            "equation", "expression", "function", "graph", "number",
        ],
    },
    "Physics": {
        "Mechanics": [
            "velocity", "acceleration", "force", "momentum", "torque",
            "friction", "gravity", "projectile", "circular motion",
            "work", "energy", "power", "collision", "elasticity",
        ],
        "Thermodynamics": [
            "thermodynamics", "heat", "temperature", "entropy", "enthalpy",
            "carnot", "isothermal", "adiabatic", "specific heat", "latent heat",
        ],
        "Electromagnetism": [
            "current", "resistance", "voltage", "capacitor", "inductor",
            "magnetic field", "electric field", "flux", "ohm", "kirchhoff",
            "electromagnetic", "coulomb", "faraday",
        ],
        "Optics": [
            "optics", "refraction", "reflection", "lens", "mirror",
            "wavelength", "frequency", "interference", "diffraction",
            "polarization", "prism", "refractive index",
        ],
        "Modern Physics": [
            "photoelectric", "photon", "quantum", "radioactive", "nuclear",
            "half life", "alpha", "beta", "gamma", "bohr", "planck",
        ],
        "Waves": [
            "wave", "oscillation", "amplitude", "resonance", "doppler",
            "sound", "standing wave",
        ],
    },
    "Chemistry": {
        "Physical Chemistry": [
            "molar", "mole", "molarity", "molality", "equilibrium",
            "reaction rate", "kinetics", "activation energy", "ph",
            "acid", "base", "buffer", "colligative", "osmosis",
        ],
        "Organic Chemistry": [
            "organic", "hydrocarbon", "alkane", "alkene", "alkyne",
            "alcohol", "ether", "aldehyde", "ketone", "carboxylic",
            "amine", "benzene", "aromatic", "functional group",
            "reaction mechanism", "substitution", "addition", "elimination",
        ],
        "Inorganic Chemistry": [
            "bond", "ionic", "covalent", "metallic", "periodic",
            "element", "compound", "oxidation", "reduction", "redox",
            "coordination", "transition metal", "p block", "d block",
        ],
        "Electrochemistry": [
            "electrode", "electrolysis", "galvanic", "faraday",
            "cell potential", "emf", "standard electrode",
        ],
    },
}


def classify_text(text: str) -> tuple[str, str]:
    """
    Classify the given text into a subject and topic using keyword matching.

    Checks each keyword in SUBJECT_KEYWORDS against the lowercased text.
    Returns the best matching (subject, topic) pair. If the match is
    ambiguous (tied scores or no match), subject is set to "unclassified"
    and topic is set to "General".

    Args:
        text: The question or passage text to classify.

    Returns:
        A tuple of (subject, topic) strings.
    """
    lower_text = text.lower()
    scores: dict[str, dict[str, int]] = {}

    for subject, topics in SUBJECT_KEYWORDS.items():
        scores[subject] = {}
        for topic, keywords in topics.items():
            count = sum(1 for kw in keywords if kw in lower_text)
            scores[subject][topic] = count

    best_subject = "unclassified"
    best_topic = "General"
    best_score = 0
    second_best_score = 0

    for subject, topics in scores.items():
        for topic, score in topics.items():
            if score > best_score:
                second_best_score = best_score
                best_score = score
                best_subject = subject
                best_topic = topic
            elif score == best_score and score > 0:
                second_best_score = score

    if best_score == 0 or best_score == second_best_score:
        return "unclassified", "General"

    return best_subject, best_topic
