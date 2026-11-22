# Abstractions from economics, human factors, medicine and safety science

This file holds references gathered on 2026-11-22 for the design of the next OpenFabric experiments. Each entry gives its sources and says how far it was verified. The file reports what the references say and gives no design advice.

Notes on verification. "Opened" means the page or document text was read. Some sources blocked automated fetching (JSTOR, PubMed, Science, NEJM). For those, the route used is named in the entry. Figures that came only from search summaries are marked as such.

## Summary table

| # | Concept | Who and when | One-line idea | Confidence |
|---|---------|--------------|---------------|------------|
| 1 | Electrification and the productivity paradox (economic history) | Paul A. David, AER 80(2), 1990 | Electric motors gave no productivity gain for about four decades, until factories were rebuilt around unit drive. | Verified for David's claims and figures. Later economists partly verified. |
| 2 | Checklists in high-risk work (surgery, aviation) | Haynes et al., NEJM 2009. Urbach et al., NEJM 2014. Model 299 crash, 1935 | A surgical checklist cut deaths and complications in a before-and-after study. An Ontario study did not reproduce it. | Haynes and Urbach numbers verified in index records. The 1935 origin story is not fully verified. |
| 3 | Defaults and status quo bias | Samuelson and Zeckhauser 1988. Johnson and Goldstein 2003. Madrian and Shea 2001 | The option applied when a person does nothing is chosen far more often. | Partly verified. The 2003 Science letter was not opened. |
| 4 | Forcing functions, constraints, knowledge in the world | Donald Norman, The Design of Everyday Things (revised edition 2013) | Put the needed information in the environment and make the wrong action hard or impossible. | Partly verified. Terms confirmed on the author's page. Definitions from secondary summaries. |
| 5 | Swiss cheese model | James Reason, 1990. BMJ 2000 | Imperfect defence layers with shifting holes. Harm gets through when holes align. | Verified for Reason's account. Criticisms partly verified. |
| 6 | Diagnostic testing: sensitivity, specificity, predictive value, series versus parallel | Altman and Bland, BMJ 1994 | PPV depends on prevalence. Series raises specificity. Parallel raises sensitivity. | Partly verified. No textbook source such as Gordis was opened. |
| 7 | Signal detection theory | Green and Swets, 1966 | Misses and false alarms trade off along a criterion that can be moved. | Partly verified. The 1966 book was not opened. |
| 8 | Rules at the point of use versus a long manual | Sweller 1988. Chandler and Sweller 1991. Degani and Wiener 1990 | Integrated, nearby information lowers cognitive load. | Partly verified for the principle. The specific comparison was not found. |
| 9 | Triage and escalation | Larrey (credited). Iserson and Moskop, 2007 | Sort cases by need and route them to the right resource. | Partly verified, from abstracts and excerpts. |
| 10 | Resilience engineering | Hollnagel, Woods and Leveson, 2006. Woods 2015 | Design for adjustment under surprise. Graceful extensibility as the opposite of brittleness. | Partly verified, from search summaries and catalogue records. |

## 1. Electrification and productivity (economic history)

**Concept:** The "productivity paradox", read through the dynamo. Field: economic history.

**Who and when:** Paul A. David, "The Dynamo and the Computer: An Historical Perspective on the Modern Productivity Paradox", American Economic Review 80(2), pp. 355-361, May 1990. It is a short conference paper.

**What it says:** Factory electrification showed no productivity effect for about four decades after the first central power station. The delay came partly from the "group drive" retrofit. In group drive, electric motors turned shaft sections, and the old belts, shafts and engines stayed in place. The gains arrived with "unit drive" (one motor per machine). Unit drive let factories be rebuilt as lighter single-storey buildings laid out around material flow.

**Verified numbers (from the paper's text):**
- In 1899 electric motors were under 5 percent of US factory mechanical drive.
- Roughly two more decades were needed to reach 50 percent.
- Factory electrification did not affect manufacturing productivity before the early 1920s. At that time "only slightly more than half" of drive capacity had been electrified. David puts this "four decades after the first central power station".
- David credits about half of the 5-point TFP growth acceleration in 1919-29 to growth in secondary motor capacity.
- The paper lists four benefits of unit drive: lighter construction, single-storey layouts, better materials handling and flexible reconfiguration, and less downtime for maintenance and rearrangement.

**Later economists:**
- Atkeson and Kehoe (NBER Working Paper 8676) support a delay from slow diffusion and plant-level learning. They say their model casts doubt on the computer analogy. This was seen only in search summaries, not in the paper.
- Triplett (St. Louis Fed article, opened) argues that computing's price collapse implies a different diffusion process. He notes that water and steam power long survived electricity.
- Brynjolfsson, Rock and Syverson, "The Productivity J-Curve", AEJ: Macroeconomics 13(1):333-72, 2021, extends the idea. It argues that complementary intangible investments make measured productivity too low early and too high later.

**Sources:**
- [1990-david.pdf](https://gwern.net/doc/economics/automation/1990-david.pdf) (David 1990, scanned JSTOR copy, text extracted and read)
- [Have Computers Made Us More Productive? A Puzzle](https://www.stlouisfed.org/Publications/Regional-Economist/October-1998/Have-Computers-Made-Us-More-Productive-A-Puzzle)

**Confidence:** Verified for David's claims and figures. The Atkeson-Kehoe and Brynjolfsson entries are partly verified (search summaries only). No source disputing the mechanism itself was found, only its fit as an analogy.

## 2. Checklists in high-risk work

**Concept:** The checklist as a safety tool. Fields: aviation, surgery.

**Who and when:**
- Haynes, Weiser, Berry, Lipsitz, Gawande and colleagues, NEJM 360(5):491-499, 2009.
- Aviation: the Boeing Model 299 crash at Wright Field, Ohio, on 30 October 1935.

**What it says:**
- Haynes tested a 19-item WHO surgical checklist in eight hospitals, comparing 3,733 patients before the checklist with 3,955 after.
- After the 1935 crash, the Air Corps developed takeoff, flight, landing and after-landing checklists. It treated human memory as the limit.

**Verified numbers:**
- Death rate 1.5% to 0.8% (P=0.003). Inpatient complications 11.0% to 7.0% (P<0.001). The design was before-and-after with no control group.
- Failed replication: Urbach et al., NEJM 370(11):1029-1038, 2014, covering 101 Ontario hospitals and about 109,000 and 106,000 procedures before and after. Adjusted death risk was 0.71% before and 0.65% after (P=0.13). Complications were 3.86% before and 3.82% after (P=0.29). The authors concluded the checklists were "not associated with significant reductions in operative mortality or complications". These figures came from the Europe PMC record and a search summary, not the full text.
- Aviation: the crash killed Maj. Ployer Hill and Boeing pilot Leslie Tower. The board attributed the crash to a locked elevator control, with pilot error only by implication (Air & Space Forces Magazine, opened).

**Sources:**
- [Haynes 2009 record (Europe PMC)](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:19144931&resultType=core&format=json)
- [Urbach 2014 record (Europe PMC)](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:24620866&resultType=core&format=json)
- [The Checklist](https://www.airandspaceforces.com/article/0813checklist/)

**Confidence:** Haynes and Urbach numbers verified in the index record text. The Model 299 crash facts are verified. "Checklists originated in 1935" is not (see the contradictions section).

## 3. Defaults

**Concept:** The default effect or status quo bias. Field: behavioural economics and psychology.

**Who and when:**
- Samuelson and Zeckhauser 1988, J. Risk and Uncertainty 1(1):7-59 (status quo bias).
- Johnson and Goldstein, "Do Defaults Save Lives?", Science 302(5649):1338-1339, 2003.
- Madrian and Shea, QJE 116(4):1149-1187, 2001.

**What it says:** The option that applies when a person does nothing is chosen far more often than chance would allow, even for high-stakes choices. Johnson and Goldstein explain it by implied recommendation, the effort of changing, and status quo and loss aversion.

**Verified numbers (from the authors' 2004 Transplantation paper, opened):**
- Online experiment, 161 respondents. Opt-out and opt-in consent differed by about a factor of two. The neutral condition was 79% in the paper's Table 1.
- The 82% and 42% figures for the other two conditions came from a secondary summary, not from an opened source.
- European countries: the opt-in and opt-out distributions did not overlap, with nearly 60 percentage points between them.
- Actual donations per million rose from 14.1 to 16.4 under presumed consent (16.3%).
- 401(k): the share of new employees saving anything rose from 31% to 86% when the default contribution went from 0% to 3%. Search summaries give 37% to 86% for Madrian and Shea's participation measure.
- Virginia mandated choice: over 24% refused to report a preference (2004 paper).

**Sources:**
- [Defaults and Donation Decisions](https://www.dangoldstein.com/papers/JohnsonGoldstein_Defaults_Transplantation2004.pdf)
- [Citation record for "Do defaults save lives?" (Europe PMC)](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE:%22Do%20defaults%20save%20lives%22&resultType=core&format=json)

**Confidence:** Partly verified. The 2003 Science letter could not be opened, so its exact per-country rates are unverified. The widely quoted Denmark 4.25% and Austria 99.98% are not confirmed. The 2004 paper's own data show these are effective consent rates, not donation rates.

## 4. Forcing functions, constraints, knowledge in the world

**Concept:** Design terms from human-computer interaction and design psychology.

**Who and when:** Donald Norman, The Design of Everyday Things. The revised edition is Basic Books, 2013. The first edition was around 1988 under another title (not verified).

**What it says:**
- "Knowledge in the head" is what you must remember. "Knowledge in the world" is information placed in the environment. It needs no learning but can be harder to use.
- Constraints are of four kinds: physical, cultural, semantic and logical.
- Forcing functions are constraints that prevent the wrong action or force the right one. Subtypes are interlocks, lock-ins and lock-outs. A car key is the standard example.

**Worth quoting:** Forcing functions can hinder normal use, which leads people to disable them. This comes from a secondary summary.

**Sources:**
- [The Design of Everyday Things, Revised and Expanded Edition](https://jnd.org/the-design-of-everyday-things-revised-and-expanded/) (the author's page, which lists chapter and section titles but does not define the terms)

**Confidence:** Partly verified. The structure and terms are confirmed on Norman's own page. The definitions come from secondary summaries. The book itself was not read.

## 5. Swiss cheese model

**Concept:** Layered, imperfect defences in accident causation. Field: safety science.

**Who and when:** James Reason, from 1990 (Human Error, book, 1990). The BMJ exposition is "Human error: models and management", BMJ 2000;320:768.

**What it says:**
- Defences, whether engineered safeguards, people or procedures, are like cheese slices with holes. The holes keep opening, shutting and shifting.
- Harm reaches a victim mainly when holes in several layers line up.
- Holes come from active failures (unsafe acts at the sharp end) and latent conditions (decisions by designers and management). Latent conditions can lie dormant for years and be found and fixed beforehand.
- On adding layers: more layers mean more chances to block a trajectory. The sources opened do not discuss layers that add complexity.

**Criticisms:**
- Perneger 2005 (BMC Health Services Research) found that professionals interpret the model inconsistently. Eleven interpretations matched the author's reading and 12 did not.
- Critics call it too simple and too general, citing Eurocontrol 2006.
- Larouzee and Le Coze (Safety Science 126, 2020) catalogue the critiques and defend the model. They name Leveson and Dekker as critics.

**Sources:**
- [Human error: models and management (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC1117770/)
- [Swiss cheese model](https://en.wikipedia.org/wiki/Swiss_cheese_model)

**Confidence:** Verified for Reason's own account. The criticisms are partly verified, from summaries only.

## 6. Diagnostic testing

**Concept:** Sensitivity, specificity, predictive value, and series versus parallel testing. Field: clinical epidemiology.

**Who and when:** Altman and Bland, "Diagnostic tests 2: predictive values", BMJ 309:102, 9 July 1994, and "Diagnostic tests 1: sensitivity and specificity".

**What it says:**
- Sensitivity is the share of diseased people the test flags. Specificity is the share of healthy people it clears.
- Positive predictive value is the share of positives who are truly diseased. It moves with prevalence, the proportion of the tested group who have the condition.
- Testing in series, where all tests must be positive, raises specificity and lowers sensitivity. Testing in parallel, where any positive counts, raises sensitivity.

**Verified number:** Altman and Bland's worked example gives PPV 0.45 and NPV 0.95 at prevalence 0.25 (from a search summary).

**Sources:**
- [Diagnostic tests 2: predictive values (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2540558)
- [Principles of Diagnostic Testing Series, Part 5](https://blogs.extension.msstate.edu/theriskproject/principles-of-diagnostic-testing-series-part-5/) (opened)

**Confidence:** Partly verified. No original textbook source such as Gordis was found. There is a naming conflict: some sources (Radiopaedia, via search) call "both must be positive" parallel, and others call it series. For independent tests the formulas are Se(series) = Se1 x Se2, Sp(series) = 1-(1-Sp1)(1-Sp2), and the reverse for parallel.

## 7. Signal detection theory

**Concept:** Separating discriminability from response bias. Field: psychophysics and decision theory.

**Who and when:** David M. Green and John A. Swets, Signal Detection Theory and Psychophysics, 1966.

**What it says:**
- An observer's hits and false alarms depend on sensitivity (d') and on a moveable criterion.
- Shifting the criterion trades misses for false alarms along the receiver operating characteristic (ROC) curve, without changing d'.
- Beta is 1 when the criterion sits where the two distributions cross.

**Sources:**
- [sdtchapter.pdf (NYU handout)](https://www.cns.nyu.edu/~eero/math-tools/Handouts/sdtchapter.pdf)
- [Signal Detection Theory](https://psychology.hanover.edu/JavaTest/SDT/ROC.html)

**Confidence:** Partly verified. The 1966 book was not opened. The summaries say Green and Swets criticised older methods for failing to separate sensitivity from response bias.

## 8. Rules at the point of use versus a long manual

**Concept:** Cognitive load theory, and checklist and job-aid design. Field: educational and human factors psychology.

**Who and when:**
- John Sweller 1988, Cognitive Science, "Cognitive Load During Problem Solving: Effects on Learning".
- Chandler and Sweller 1991, Cognition and Instruction 8(4):293-332.
- Degani and Wiener, NASA Contractor Report 177549, 1990 (the NTRS record lists May 1991).

**What it says:**
- Integrating related information at the place where it is needed reduces extraneous cognitive load (the split-attention effect).
- Degani and Wiener analyse checklist design and length. They say checklist non-use or misuse contributes to accidents.
- Drury, Ma and Woodcock 2001 found that investigation performance improved significantly when job aids were actually used. Four of 15 users did not use them.

**What could not be sourced:** A controlled study showing better rule adherence at the point of use than from a long manual. None of the sources found tested that directly. The aviation-maintenance documents are classification, interview or observational reports.

**Related fact:** Pronovost 2006 (NEJM). A package that included a checklist cut the median catheter infection rate from 2.7 to 0 per 1000 catheter-days at 3 months. That was a multi-part intervention, so the checklist's own contribution is not separable.

**Sources:**
- [NASA NTRS record for CR 177549](https://ntrs.nasa.gov/citations/19910017830) (found in search, not opened)
- [Do Job Aids Help Incident Investigation?](https://woodcock.blog.torontomu.ca/2001/09/04/do-job-aids-help-incident-investigation/)

**Confidence:** Partly verified for the general principle. Not verified for the specific comparison. Sweller, Chandler and Sweller, Degani and Wiener, Drury and Pronovost details came from search summaries only.

## 9. Triage and escalation

**Concept:** Sorting cases by need and routing them to the right resource. Field: emergency and military medicine.

**Who and when:** Baron Dominique-Jean Larrey, Napoleon's chief surgeon, is credited with the first formal battlefield triage. Source: Iserson and Moskop, Ann Emerg Med 49(3):275-281, 2007.

**What it says:** Triage arose from the exigencies of war. It ranks patients by urgency and need, then allocates scarce skill and time accordingly.

**Sources:**
- [Triage in medicine, part I: Concept, history, and types](https://pubmed.ncbi.nlm.nih.gov/17141139/) (citation found in search, page blocked)

**Confidence:** Partly verified, from abstracts and excerpts. The full text was not read. No escalation protocol such as the Manchester or ESI triage scales was verified.

## 10. Resilience engineering

**Concept:** Resilience engineering, graceful degradation and graceful extensibility. Field: safety science.

**Who and when:**
- Hollnagel, Woods and Leveson (eds.), Resilience Engineering: Concepts and Precepts, Ashgate, 2006.
- Hollnagel's four abilities appear in Resilience Engineering in Practice (Paries, Hollnagel, Wreathall, 2011).
- Woods, "Four concepts for resilience and the implications for the future of resilience engineering", Reliability Engineering and System Safety 141:5-9, 2015.

**What it says:**
- Performance must continually adjust to current conditions, and such adjustment is always approximate. Failure is treated as the result of adaptations to a complex world.
- Hollnagel's four abilities are to respond, monitor, anticipate and learn.
- Woods separates four concepts: rebound, robustness, graceful extensibility and adaptive network architectures. He coined "graceful extensibility" as a blend of graceful degradation and software extensibility. It means extending performance when surprises push a system past its boundary, as the opposite of brittleness.

**Sources:**
- [Resilience Engineering: Concepts and Precepts](https://www.routledge.com/Resilience-Engineering-Concepts-and-Precepts/Hollnagel-Woods-Leveson/p/book/9780754649045) (found in search, not opened)
- [Four concepts for resilience and the implications for the future of resilience engineering](https://ideas.repec.org/a/eee/reensy/v141y2015icp5-9.html)

**Confidence:** Partly verified, from search summaries and catalogue records. No primary source was found that defines "graceful degradation" in Hollnagel's own wording.

## Concepts not researched in depth

These fit the three working ideas. They are listed briefly.

- **Status quo bias and the cost of changing a default.** Samuelson and Zeckhauser 1988, J. Risk and Uncertainty 1(1):7-59. Verified bibliographically. It underlies both the default effect and the "piece carries the knowledge" idea.
- **Productivity J-curve.** Brynjolfsson, Rock and Syverson, AEJ: Macroeconomics 13(1):333-72, 2021. Complementary intangible investments make measured productivity look too low early on. Seen in search summaries only.
- **Graceful extensibility versus brittleness.** Woods 2015, covered in entry 10. It is a sharper version of "keep working when a part fails".
- **Mandated choice and the cost of deciding.** From the Johnson and Goldstein 2004 paper: when Virginia forced people to state a donation preference, over 24% refused to report one.
- **Checklist design limits.** Degani and Wiener, covered in entry 8. Checklists have documented failure modes, such as length and misuse.

## Where sources contradict the popular version

- **Model 299 and the checklist.** The popular claim is that pilot error caused the crash and that this created the checklist. The Air & Space Forces article says the board did not directly blame the pilots, and the cause was the elevator lock. It says checklist-like aids existed earlier, and the crash led to their formal use. Wikipedia notes the "checklist began in 1935" story is widely accepted but questioned, and that the word "checklist" is documented from 1841 and 1853. The pre-1935 aviation history was not verified.
- **Surgical checklist.** Haynes 2009 showed large reductions, but Urbach 2014 (101 Ontario hospitals) found no significant ones. Gawande, a Haynes co-author, raised methodological concerns about the Ontario study. The editorial by Leape (via summary) points to implementation quality.
- **Organ donation.** The headline is presented as a donation rate. The 2004 paper's country data are effective consent rates. Actual donation per million rose by only 16.3%, from 14.1 to 16.4.
- **Electrification.** "Nothing changed until the factory was reorganised" is partly David's account. His paper also stresses sunk capital, persistence of old equipment, measurement bias in indirect benefits, and the 50% diffusion threshold. Atkeson and Kehoe's own model casts doubt on the computer analogy.
- **Swiss cheese.** It is often read as a rule that adding layers makes a system safer. The Reason text opened does not say that. Perneger (2005) found even safety professionals disagree on what the model means.
