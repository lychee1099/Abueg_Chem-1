// just get needed input fields and stuff
const input_text = document.getElementById("input_text");
const previewWrapper = document.getElementById("preview_text_wrapper");
const previewText = document.getElementById("preview_text");

const start_unit = document.getElementById("start_unit");

const element_compound_molecule_type = document.getElementById("element_compound_molecule_type");
const element_compound_molecule_type_2 = document.getElementById("element_compound_molecule_type_2");

const end_unit = document.getElementById("end_unit");

// for ease
const AVOGADRO_LATEX = "6.022 \\times 10^{23}";
const AVOGADRO = 6.022e23;

const MAX_WIDTH = 980;

// for ease
function convertToLaTeX(input) {
    return input
        .replace(/\*/g, ' \\cdot ')                // replace * with \cdot
        .replace(/\^\(([^)]+)\)/g, '^{\$1}');      // replace ^(n) with ^{n}
}

function convertToLatexSciNotation(JS_SCI_NOTATION) {
    if (JS_SCI_NOTATION.toString().includes("e")) {
        const parts = JS_SCI_NOTATION.toString().split("e");
        const left = parts[0];
        const exponent = parts[1];

        return `${left}~\\times~10^{${exponent}}`;
    }

    return JS_SCI_NOTATION;
}

function convertToJSSciNotation(LATEX_SCI_NOTATION) {
    if (LATEX_SCI_NOTATION.includes("\\cdot 10^")) {
        LATEX_SCI_NOTATION = LATEX_SCI_NOTATION.replace("\\cdot 10^{", "e");
        LATEX_SCI_NOTATION = LATEX_SCI_NOTATION.replace("}", "");
        LATEX_SCI_NOTATION = LATEX_SCI_NOTATION.replace(/ /g, "");

        return LATEX_SCI_NOTATION;
    }
    return LATEX_SCI_NOTATION;
}

// main chemistry logic ----------------------

// grams -> mol -> amount
// amount -> mol -> grams

// mol to grams
function convertMolToGrams(mols, molar_mass) {
    return mols * molar_mass;
}

// mol to amount
function convertMolToAmount(mols) {
    return mols * AVOGADRO;
}

// grams to mol
function convertGramsToMol(grams, molar_mass) {
    return grams * 1/(molar_mass);
}

// grams to amount
function convertGramsToAmount(grams, molar_mass) {
    return convertMolToAmount( convertGramsToMol(grams, molar_mass) );
}

// amount to mol
function convertAmountToMol(amount) {
    return amount * 1/AVOGADRO;
}

// amount to grams
function convertAmountToGrams(amount, molar_mass) {
    return convertMolToGrams(convertAmountToMol(amount), molar_mass);
}

// molecule to its atoms
function convertMolecToItsAtoms(molec, ratio) {
    return molec * ratio;
}

//-------------------------

// main meat showing the given, known, and step-by-step solution
async function updatePreview() {
    // get the input
    var rawInput = input_text.value.trim();
    const latexInput = convertToLaTeX(rawInput);
    rawInput = convertToJSSciNotation(latexInput);
    
    // get element or compound and the units
    const element = element_compound_molecule_type.value.trim();
    const element_2 = element_compound_molecule_type_2.value.trim();

    if (element == "" || element_2 == "") {
            previewText.innerHTML = "";
            return;
    }

    const starting_unit = start_unit.value;
    const ending_unit = end_unit.value;

    const element_for_CI = element.replace("_", "");
    const element_for_CI_2 = element_2.replace("_", "");

    var result;

    try {
        result = CI.Chemcalc.analyseMF(element_for_CI);
        element_compound_molecule_type.classList.remove("error");
    } catch (error) {
        element_compound_molecule_type.classList.add("error");
        previewText.innerHTML = `\\[\\text{Bad input: Make sure no trailing symbols are present and that actual chemical symbols are used.} \\]`
        MathJax.typesetPromise();
        return;
    }

    // get the number of each atom for ratios
    const atoms = result.parts[0].ea;
    
    // make a new dictionary from the info above for ease
    const atoms_dict = new Object;
    var atoms_dictLatex = "With these no. of atoms: ";
    for (let i = 0; i < atoms.length; i++) {
        atoms_dict[atoms[i].element] = atoms[i].number;
        atoms_dictLatex += atoms[i].number + " " + atoms[i].element + " atom(s), ";
    }

    // write goal, know, and solution
    const goalLatex = `Goal: ${latexInput}~\\text{${starting_unit}}~${element}~to~\\text{${ending_unit}}~${element_2}`;
    const knowLatex = `Know: ${result.mw}~\\text{g/mol}~${element}~\\text{and}~${AVOGADRO_LATEX}~\\text{[atoms or molecules]/mol}~${element}`;
    var solLatex;
    var ansLatex;
    var result_;

    var good_input = false;

    if (element_for_CI == element_for_CI_2) {
        if (starting_unit == "grams") {
            if (ending_unit == "mol") {
                result_ = convertGramsToMol(rawInput, result.mw);
                ansLatex = `Answer: ${result_}~mol~${element}`;

                // grams * (mol / grams)
                solLatex = `Solution: (${latexInput}~g~${element})
                            (\\frac{1~mol~${element}}{${result.mw}~g~${element}})~=~${result_}~mol~${element}`;

                good_input = true;

            } else if (ending_unit == "atoms/molecules") {
                result_ = convertToLatexSciNotation(convertGramsToAmount(rawInput, result.mw));
                ansLatex = `Answer: ${result_}~atoms/molecules~${element}`;

                // grams * (mol / grams) * (avo/mol)
                solLatex = `Solution: (${latexInput}~g~${element})
                            (\\frac{1~mol~${element}}{${result.mw}~g~${element}})
                            (\\frac{${AVOGADRO_LATEX}~atoms/molecules~${element}}{1~mol~${element}})
                            ~=~${result_}~atoms/molecules~${element}`;

                good_input = true;
            } else {
                ansLatex = `\\text{Start and end units may be the same while wanting the same element/compound}`;
                previewText.innerHTML = `\\[${ansLatex} \\]`;
            }
        } else if (starting_unit == "mol") {
            if (ending_unit == "grams") {
                result_ = convertMolToGrams(rawInput, result.mw);
                ansLatex = `Answer: ${result_}~g~${element}`;

                // mol * (g/mol)
                solLatex = `Solution: (${latexInput}~mol~${element})
                            (\\frac{${result.mw}~g~${element}}{1~mol~${element}})~=~${result_}~g~${element}`;

                good_input = true;

            } else if (ending_unit == "atoms/molecules") {
                result_ = convertMolToAmount(rawInput);
                ansLatex = `Answer: ${result_}~atoms/molecules~${element}`;

                // mol * (avo/mol)
                solLatex = `Solution: (${latexInput}~mol~${element})
                            (\\frac{${AVOGADRO_LATEX}~atoms/molecules~${element}}{1~mol~${element}})
                            ~=~${result_}~atoms/molecules~${element}`;
                
                good_input = true;

            } else {
                ansLatex = `\\text{Start and end units may be the same while wanting the same element/compound}`;
                previewText.innerHTML = `\\[${ansLatex} \\]`;
            }
        } else if (starting_unit == "atoms/molecules") {
            if (ending_unit == "grams") {
                result_ = convertAmountToGrams(rawInput, result.mw);
                ansLatex = `Answer: ${result_}~g~${element}`;

                // amount * (mol / avogadro) * (g/mol)
                solLatex = `Solution: (${latexInput}~atoms/molecules~${element})
                            (\\frac{1~mol~${element}}{${AVOGADRO_LATEX}~atoms/molecules~${element}})
                            (\\frac{${result.mw}~g~${element}}{1~mol~${element}})
                            ~=~${result_}~mol~${element}`;

                good_input = true;

            } else if (ending_unit == "mol") {
                result_ = convertAmountToMol(rawInput);
                ansLatex = `Answer: ${result_}~mol~${element}`;

                // amount * (mol / avogadro)
                solLatex = `Solution: (${latexInput}~atoms/molecules~${element})
                            (\\frac{1~mol~${element}}{${AVOGADRO_LATEX}~atoms/molecules~${element}})
                            ~=~${result_}~mol~${element}`;

                good_input = true;

            } else {
                ansLatex = `\\text{Start and end units may be the same while wanting the same element/compound}`;
                previewText.innerHTML = `\\[${ansLatex} \\]`;
            }
        }
    } else {
        var mass_second;
        try {
            mass_second = CI.Chemcalc.analyseMF(element_for_CI_2).mw;
            element_compound_molecule_type_2.classList.remove("error");
        } catch (error) {
            element_compound_molecule_type_2.classList.add("error");
            previewText.innerHTML = `\\[\\text{Bad input: Make sure no trailing symbols are present and that actual chemical symbols are used.} \\]`
            MathJax.typesetPromise();
            return;
        }

        if (element.includes(element_2) && element_2 in atoms_dict) {
            if (starting_unit == "grams") {
                good_input = true;
                var ratio = atoms_dict[element_2];

                if (ending_unit == "mol") {
                    result_ = convertGramsToAmount(rawInput, result.mw);
                    result_ = convertMolecToItsAtoms(result_, ratio);
                    result_ = convertToLatexSciNotation(convertAmountToMol(result_));

                    ansLatex = `Answer: ${result_}~mol~${element_2}`;
                    
                    // grams * (mol / grams) * (avo/mol) * (atoms of spec elem/molecule) * (1mol[elem2]/avogadro[atoms])
                    solLatex = `Solution: (${latexInput}~g~${element})
                                (\\frac{1~mol~${element}}{${result.mw}~g~${element}})
                                (\\frac{${AVOGADRO_LATEX}~atoms/molecules~${element}}{1~mol~${element}})
                                (\\frac{${ratio}~atom(s)~${element_2}}{1~molecule~${element}})
                                (\\frac{1~mol~${element_2}}{${AVOGADRO_LATEX}~atoms~${element_2}})
                                ~=~${result_}~mol~${element_2}`;

                } else if (ending_unit == "atoms/molecules") {
                    result_ = convertGramsToAmount(rawInput, result.mw);
                    result_ = convertToLatexSciNotation(convertMolecToItsAtoms(result_, ratio));

                    ansLatex = `Answer: ${result_}~atoms/molecules~${element_2}`;

                    // grams * (mol / grams) * (avo/mol) * (atoms of spec elem/molecule)
                    solLatex = `Solution: (${latexInput}~g~${element})
                                (\\frac{1~mol~${element}}{${result.mw}~g~${element}})
                                (\\frac{${AVOGADRO_LATEX}~atoms/molecules~${element}}{1~mol~${element}})
                                (\\frac{${ratio}~atom(s)~${element_2}}{1~molecule~${element}})
                                ~=~${result_}~atoms/molecules~${element_2}`;

                } else {
                    result_ = convertGramsToAmount(rawInput, result.mw);
                    result_ = convertMolecToItsAtoms(result_, ratio);
                    result_ = convertAmountToMol(result_);

                    result_ = convertToLatexSciNotation(convertMolToGrams(result_, mass_second));

                    ansLatex = `Answer: ${result_}~g~${element_2}`;
                    
                    // grams * (mol / grams) * (avo/mol) * (atoms of spec elem/molecule) * (1mol[elem2]/avogadro[atoms]) * (g/mol)
                    solLatex = `Solution: (${latexInput}~g~${element})
                                (\\frac{1~mol~${element}}{${result.mw}~g~${element}})
                                (\\frac{${AVOGADRO_LATEX}~atoms/molecules~${element}}{1~mol~${element}})
                                (\\frac{${ratio}~atom(s)~${element_2}}{1~molecule~${element}})
                                (\\frac{1~mol~${element_2}}{${AVOGADRO_LATEX}~atoms~${element_2}})
                                (\\frac{${mass_second}~g~${element_2}}{1~mol~${element_2}})
                                ~=~${result_}~g~${element_2}`;
                }
            } else if (starting_unit == "mol") {
                if (ending_unit == "grams") {
                    result_ = convertMolToAmount(rawInput);
                    result_ = convertMolecToItsAtoms(result_, ratio);
                    result_ = convertAmountToMol(result_);

                    result_ = convertToLatexSciNotation(convertMolToGrams(result_, mass_second));
                    ansLatex = `Answer: ${result_}~g~${element_2}`;

                    // mol * (avo/mol) * (atoms of elem2/molecule of elem 1) * (mol2/avog of elem2) * (g/mol)
                    solLatex = `Solution: (${latexInput}~mol~${element})
                                (\\frac{${AVOGADRO_LATEX}~atoms/molecules~${element}}{1~mol~${element}})
                                (\\frac{${ratio}~atom(s)~${element_2}}{1~molecule~${element}})
                                (\\frac{1~mol~${element_2}}{${AVOGADRO_LATEX}~atoms~${element_2}})
                                (\\frac{${mass_second}~g~${element_2}}{1~mol~${element_2}})
                                ~=~${result_}~g~${element_2}`;

                } else if (ending_unit == "atoms/molecules") {
                    result_ = convertMolToAmount(rawInput);
                    result_ = convertToLatexSciNotation(convertMolecToItsAtoms(result_, ratio));
                    ansLatex = `Answer: ${result_}~atoms/molecules~${element_2}`;

                    // mol * (avo/mol) * (atoms of spec elem/molecule)
                    solLatex = `Solution: (${latexInput}~mol~${element})
                                (\\frac{${AVOGADRO_LATEX}~atoms/molecules~${element}}{1~mol~${element}})
                                (\\frac{${ratio}~atom(s)~${element_2}}{1~molecule~${element}})
                                ~=~${result_}~atoms/molecules~${element_2}`;

                } else {
                    result_ = convertMolToAmount(rawInput);
                    result_ = convertMolecToItsAtoms(result_, ratio);
                    result_ = convertToLatexSciNotation(convertAmountToMol(result_));

                    ansLatex = `Answer: ${result_}~mol~${element_2}`;

                    // mol * (avo/mol) * (atoms of elem2/molecule of elem 1) * (mol2/avog of elem2)
                    solLatex = `Solution: (${latexInput}~mol~${element})
                                (\\frac{${AVOGADRO_LATEX}~atoms/molecules~${element}}{1~mol~${element}})
                                (\\frac{${ratio}~atom(s)~${element_2}}{1~molecule~${element}})
                                (\\frac{1~mol~${element_2}}{${AVOGADRO_LATEX}~atoms~${element_2}})
                                ~=~${result_}~mol~${element_2}`;
                }
            } else if (starting_unit == "atoms/molecules") {
                if (ending_unit == "grams") {
                    result_ = convertMolecToItsAtoms(rawInput, ratio);
                    result_ = convertAmountToMol(result_);

                    result_ = convertToLatexSciNotation(convertMolToGrams(result_, mass_second));

                    ansLatex = `Answer: ${result_}~mol~${element_2}`;

                    // no. of molec of elem 1 * (atoms of spec elem/molecule) * (mol2/avog of elem2) * (g elem2/mol2)
                    solLatex = `Solution: (${latexInput}~atoms/molecules~${element})
                                (\\frac{${ratio}~atom(s)~${element_2}}{1~molecule~${element}})
                                (\\frac{1~mol~${element_2}}{${AVOGADRO_LATEX}~atoms~${element_2}})
                                (\\frac{${mass_second}~g~${element_2}}{1~mol~${element_2}})
                                ~=~${result_}~g~${element_2}`;

                } else if (ending_unit == "mol") {
                    result_ = convertMolecToItsAtoms(rawInput, ratio);
                    result_ = convertToLatexSciNotation(convertAmountToMol(result_));

                    ansLatex = `Answer: ${result_}~mol~${element_2}`;

                    // no. of molec of elem 1 * (atoms of spec elem/molecule) * (mol2/avog of elem2)
                    solLatex = `Solution: (${latexInput}~atoms/molecules~${element})
                                (\\frac{${ratio}~atom(s)~${element_2}}{1~molecule~${element}})
                                (\\frac{1~mol~${element_2}}{${AVOGADRO_LATEX}~atoms~${element_2}})
                                ~=~${result_}~mol~${element_2}`;

                } else {
                    result_ = convertToLatexSciNotation(convertMolecToItsAtoms(rawInput, ratio));
                    ansLatex = `Answer: ${result_}~atoms/molecules~${element_2}`;

                    // no. of molec of elem 1 * (atoms of spec elem/molecule)
                    solLatex = `Solution: (${latexInput}~atoms/molecules~${element})
                                (\\frac{${ratio}~atom(s)~${element_2}}{1~molecule~${element}})
                                ~=~${result_}~atoms/molecules~${element_2}`;
                }
            }
        } else {
            previewText.innerHTML = "Ratios between two molecules or other atoms are not supported since a balanced equation is needed.";
        }
    }

    if (good_input) {
        previewText.innerHTML = `\\[${goalLatex}\\] 
                                \\[${knowLatex}\\]
                                \\[\\text{${atoms_dictLatex}} \\]
                                \\[${ansLatex} \\]
                                \\[${solLatex} \\]`;
    }

    MathJax.typesetPromise();

    // scale box
    const actualWidth = previewWrapper.offsetWidth;
    const scaleFactor = actualWidth > MAX_WIDTH ? MAX_WIDTH / actualWidth : 1;

    previewWrapper.style.transform = `scale(${scaleFactor})`;
}

input_text.addEventListener('input', updatePreview);
element_compound_molecule_type.addEventListener('input', updatePreview);
element_compound_molecule_type_2.addEventListener('input', updatePreview);
start_unit.addEventListener('change', updatePreview);
end_unit.addEventListener('change', updatePreview);