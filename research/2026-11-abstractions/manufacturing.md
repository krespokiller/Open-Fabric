# Abstractions from manufacturing and quality engineering

This file collects references gathered on 2026-11-22 for the design of the next OpenFabric experiments. Each entry gives its sources and says how far it was verified. The file reports what the references say and gives no design advice.

Note on access: ASQ, engineering.com and the JHU Press page returned 403 to automated fetching, so none of them is cited as opened. Where a claim rests on general knowledge or on search-result summaries, the entry says so.

## Summary

| # | Concept | Who and when | One-line idea | Confidence |
|---|---|---|---|---|
| 1 | Go/no-go gauges and interchangeable parts | John H. Hall (Harpers Ferry), 1819-1830s; Simeon North also credited | Gauges were part of making interchangeability possible, about 90 years before the moving line | Partly verified |
| 2 | Ford moving assembly line | Ford, Highland Park, 1913-1914 | Car assembly fell from 12.5 hours to 93 minutes | Verified (baseline and unit disputed elsewhere) |
| 3 | Poka-yoke | Shigeo Shingo, 1960s; book 1986 | Prevent the mistake or make it obvious; inspect at the source | Partly verified |
| 4 | Jidoka, andon, nonconforming output | Sakichi Toyoda; Taiichi Ohno (1978 JP, 1988 EN); ISO 9001:2015 cl. 8.7 | Machine or operator stops on a fault and signals; bad units are isolated and dispositioned | Jidoka/andon verified; off-line handling partly verified |
| 5 | First pass yield and rolled throughput yield | Six Sigma practice | RTY is the product of the step yields | Partly verified |
| 6 | 1-10-100 rule | Attributed to Labovitz and Chang, 1992 | A defect costs more the later it is found | Partly verified; no data found |
| 7 | MSA and Gage R&R | AIAG manual, 1990s | The gauge has its own error and must be qualified | Partly verified |
| 8 | Acceptance sampling and OC curve | Dodge and Romig, Bell Labs, 1920s-40s | A sample decides the lot; the OC curve gives the chance of accepting | Definitions verified |
| 9 | Traveler, route card, router | Shop practice, no origin date found | A record that travels with the part | Partly verified |
| 10 | Theory of constraints | Eliyahu Goldratt, 1984 | Find the constraint, exploit it, subordinate the rest | Partly verified |
| 11 | Design for manufacture and assembly | Boothroyd and Dewhurst, 1977-1989 | Design parts so they cannot be assembled wrongly | Partly verified |
| 12 | Statistical process control | Walter Shewhart, 1924, 1931; Deming | Separate chance (common) from assignable (special) causes | Shewhart history verified; term mapping partly |

## 1. Go/no-go gauges and interchangeable parts

- **Concept:** Go/no-go gauging and interchangeable parts. Field: armory manufacturing, 1800s.
- **Who and when:**
  - John H. Hall (Harpers Ferry) is the person historians credit with achieving interchangeability. NPS says he signed a War Department contract in 1819 and wrote on 20 Dec 1822 about producing "arms exactly alike". Col. Talcott wrote in 1832 of "uniformity of parts than is to be found anywhere".
  - Simeon North is credited by Diana Muir as an alternative. Wikipedia says the task was "finally accomplished in the 1820s".
  - Eli Whitney's popular credit is called incorrect by the Wikipedia article. It says there is "no evidence that he produced any new type of metalworking machinery".
  - Honore Blanc is the French precursor.
- **What it says:** Interchangeability needed machine tools, fixtures, and "blocks and gauges to check the accuracy of finished parts" (Wikipedia). Hall used 63 gauges in three sets. One set guided the makers, one set was for inspectors, and a master set checked the other two (Works in Progress, which cites Hounshell and Smith). So gauging was a necessary part of interchangeability, not a later addition. It also predates the moving line by roughly 90 years.
- **Worth quoting:** Hall used "63 gauges, in three sets", per the Works in Progress page. That page is a secondary popular source, and I did not see the primary text of Smith or Hounshell.
- **Sources:**
  - [John H Hall (NPS)](https://www.nps.gov/hafe/learn/historyculture/john-h-hall.htm)
  - [American system of manufacturing (Wikipedia)](https://en.wikipedia.org/wiki/American_system_of_manufacturing)
  - [Digression 1 - PRECISION: How America Made Machines Make Machines (Works in Progress)](https://books.worksinprogress.co/book/maintenance-of-everything/vehicles/digression-1-precision-how-america-made-machines-make-machines/2)
  - Books to cite, with details checked only in search results: Merritt Roe Smith, *Harpers Ferry Armory and the New Technology* (Cornell UP, 1977), and David Hounshell, *From the American System to Mass Production, 1800-1932* (Johns Hopkins UP, 1984).
- **Confidence:** Partly verified. The NPS page does not mention gauges. The gauge detail comes only from a secondary article, and the books were not opened.

## 2. Ford moving assembly line, Highland Park

- **Concept:** The moving assembly line. Field: automobile manufacturing.
- **Who and when:** Ford Motor Co. The flywheel magneto went on a moving line around April 1913, and the chassis line followed in August 1913. By early 1914 three continuous lines were running.
- **What it says:** The Henry Ford's own history gives the figures below.
- **Worth quoting:**
  - Flywheel magneto: one worker took about 20 minutes per unit. On the line, "One whole flywheel came off the line every 13 minutes".
  - Complete Model T: a car every "93 minutes" against "12½ hours per car" with stationary assembly.
- **Sources:** [Ford Methods and the Ford Shops (The Henry Ford)](https://www.thehenryford.org/explore/blog/ford-methods-and-the-ford-shops)
- **Confidence:** Verified in a source I opened. Other sources, seen only in search results, disagree. One says the chassis line started 7 Oct 1913. One gives the old baseline as 728 minutes. History.com reportedly calls 93 "man-minutes" rather than elapsed time, which I did not open. Treat 12.5 h to 93 min as the official figure with a disputed baseline and unit.

## 3. Poka-yoke (mistake-proofing)

- **Concept:** Poka-yoke. Field: Toyota-era industrial engineering.
- **Who and when:** Shigeo Shingo, Toyota-era industrial engineer, 1960s. His book *Zero Quality Control: Source Inspection and the Poka-Yoke System* is Productivity Press, 1986.
- **What it says:** A poka-yoke device is "any mechanism that either prevents a mistake from being made or makes the mistake obvious at a glance" (mistakeproofing.com tutorial). Shingo distinguishes three kinds of inspection:
  - Judgment inspection sorts defects out of good product, and Shingo cautioned against it.
  - Informative inspection uses inspection data to control the process.
  - Source inspection "determines 'before the fact' whether the conditions necessary for high-quality production exist".
  - The "control" type stops production until conditions are met, and the "warning" type signals. That reading comes from Wikipedia and the tutorial's "forcing function" wording, not directly from Shingo.
- **Worth quoting:** The definition above, from the mistakeproofing.com tutorial.
- **Sources:**
  - [A Brief Tutorial on Mistake-Proofing, Poka-Yoke, and ZQC (Grout and Downs, mistakeproofing.com)](https://mistakeproofing.com/a-brief-tutorial-on-mistake-proofing-poka-yoke-and-zqc/)
  - [Poka-yoke (Wikipedia)](https://en.wikipedia.org/wiki/Poka-yoke)
- **Confidence:** Partly verified. Both sources are secondary, and I did not open Shingo's text. The control versus warning split was not stated explicitly in either page.

## 4. Jidoka, andon, and removing a defective unit without stopping the flow

- **Concept:** Jidoka and andon (Toyota Production System), and control of nonconforming output (quality management).
- **Who and when:** Sakichi Toyoda's automatic loom is the origin. Taiichi Ohno's *Toyota Production System: Beyond Large-Scale Production* was published in Japanese in 1978 and in English by Productivity Press in 1988. The 1978 and 1988 dates come from search results only.
- **What it says:** Toyota calls jidoka "automation with a human touch". Machines stop themselves on a problem so defects do not continue down the line. "When equipment stops, the andon (problem display board) lights up to notify workers of the abnormality." The operator can stop the line by pulling the stop cord.
- **Off-line handling:** The nearest established practice is nonconforming-output control in ISO 9001:2015 clause 8.7. It requires identifying outputs that fail requirements and controlling them "to prevent their unintended use or delivery". In practice this means segregation or quarantine, then disposition by a defined authority (rework, concession, scrap). Material Review Board (MRB) is the common US name for that authority. Neither of the last two points is in the standard's text as I saw it, and I did not find the MRB term in the sources I saw.
- **Worth quoting:** The Toyota andon sentence above.
- **Sources:**
  - [Production System (Toyota Motor Corporation)](https://global.toyota/en/company/vision-and-philosophy/production-system/)
  - [Clause 8.7 Control of Nonconforming Outputs (ISMS.online)](https://www.isms.online/iso-9001/clause-8-7-control-of-nonconforming-outputs). This is a search result I did not open, and it is secondary.
- **Confidence:** Jidoka and andon verified in the Toyota page I opened. The off-line handling entry is partly verified, from search-result summaries only.

## 5. First pass yield and rolled throughput yield

- **Concept:** First pass yield (FPY) and rolled throughput yield (RTY). Field: Six Sigma and quality engineering.
- **Who and when:** Six Sigma and quality engineering. No single originator found.
- **What it says:** Wikipedia defines RTY as "the probability that a process with more than one step will produce a defect free unit", computed as "the product of yields for each process step". So RTY = Y1 x Y2 x ... x Yn. For example, five stations that each pass 0.59 give 0.59^5, about 0.07.
- **Worth quoting:** The two Wikipedia phrases above.
- **Sources:**
  - [Rolled throughput yield (Wikipedia)](https://en.wikipedia.org/wiki/Rolled_throughput_yield). It cites the *ASQ Certified Six Sigma Black Belt Handbook* (Quality Press, 2023).
  - The ASQ page returned 403.
- **Confidence:** Partly verified. The RTY product rule is verified. The Wikipedia page does not define first pass yield. The usual definition is units passing a step without rework divided by units entering it, from general knowledge and not a source I opened.

## 6. The 1-10-100 cost-of-defect rule

- **Concept:** The 1-10-100 rule. Field: cost of quality.
- **Who and when:** The version most people quote is attributed to Labovitz and Chang, *Making Quality Work* (1992). Search results say it is often conflated with Boehm's 1976 software relative-cost-of-fix argument.
- **What it says:** A defect costs about 1 unit to prevent, 10 to correct in-house, and 100 once it reaches the customer.
- **Worth quoting:** AKF Partners calls it "Certainly not an exact measurement". I found no empirical study behind the ratios. A Virtualization Review writer reportedly could not trace the origin. I did not open the Labovitz book.
- **Sources:**
  - [1-10-100 Rule in Quality (AKF Partners)](https://akfpartners.com/growth-blog/1-10-100-rule-in-quality-software-development/)
  - Origin claims otherwise from search snippets.
- **Confidence:** Partly verified. The attribution is plausible, and the lack of a data basis is supported only by absence in what I saw. Treat it as a heuristic with no verified evidence behind the numbers.

## 7. Measurement systems analysis and Gage R&R

- **Concept:** Measurement systems analysis (MSA) and gauge repeatability and reproducibility. Field: quality engineering, automotive.
- **Who and when:** The AIAG *Measurement Systems Analysis* reference manual, from the 1990s auto industry.
- **What it says:** Observed variation includes measurement error, written sigma_x^2 = sigma_p^2 + sigma_e^2. Gage R&R splits measurement error into repeatability (the same operator or instrument, repeated) and reproducibility (different operators or instruments). A typical crossed study uses 10 parts, 2 operators, and 2 repeats.
- **Worth quoting:**
  - AIAG bands for %GRR are under 10% adequate, 10-30% maybe acceptable, and over 30% unacceptable.
  - AIAG itself cautions that these bands must not be used alone as threshold criteria.
  - Wheeler and the author of the SPC for Excel page argue the bands lack a documented rationale.
  - Wikipedia notes that gauge R&R "addresses only the precision of a measurement system", not its accuracy.
- **Sources:**
  - [Acceptance Criteria for Measurement Systems Analysis (MSA) (SPC for Excel)](https://www.spcforexcel.com/knowledge/measurement-systems-analysis/acceptance-criteria-for-MSA)
  - [Gauge R&R (Wikipedia)](https://en.wikipedia.org/wiki/Gauge_R%26R). It cites Burdick, Borror and Montgomery (ASA-SIAM, 2005).
- **Confidence:** Partly verified. I did not open the AIAG manual.

## 8. Acceptance sampling and the operating characteristic (OC) curve

- **Concept:** Lot acceptance sampling and the OC curve. Field: statistical quality control.
- **Who and when:** Dodge and Romig, Bell Labs, 1920s-40s. NIST says the US military used it on bullets in WWII.
- **What it says:** A sample from a lot decides accept or reject for the whole lot. The OC curve "plots the probability of accepting the lot (Y-axis) versus the lot fraction or percent defectives (X-axis)" for a plan with sample size n and acceptance number c.
- **Worth quoting:**
  - Producer's risk alpha is the probability of rejecting a lot at the AQL defect level.
  - Consumer's risk beta is the probability of accepting a lot at the LTPD defect level.
  - These are the NIST page's definitions.
- **Sources:**
  - [6.2.2. What kinds of Lot Acceptance Sampling Plans (LASPs) are there? (NIST/SEMATECH e-Handbook of Statistical Methods)](https://www.itl.nist.gov/div898/handbook/pmc/section2/pmc22.htm)
  - [6.2.1. What is Acceptance Sampling? (NIST/SEMATECH e-Handbook of Statistical Methods)](https://www.itl.nist.gov/div898/handbook/pmc/section2/pmc21.htm)
- **Confidence:** Verified for the definitions. The NIST page does not show the probability computation. The binomial or hypergeometric calculation is standard statistics, not taken from an opened source.

## 9. Traveler, route card, job router

- **Concept:** The traveler (also called route card or job router). Field: shop-floor production control.
- **Who and when:** Industrial shop practice. I found no origin date.
- **What it says:** "Instructions that travel with a part as it is built". Typical contents are part ID, quantity, due dates, a sequenced task list, special instructions, in-process inspection and test requirements, and change records. As each step happens it logs operation status and worker activity.
- **Worth quoting:** "Instructions that travel with a part as it is built" (MasterControl).
- **Sources:**
  - [Manufacturing Traveler (MasterControl)](https://www.mastercontrol.com/manufacturing/manufacturing-traveler/)
  - Search results from ERP vendors (NetSuite, Microsoft Dynamics) describe a route card as the list of operations for a works order, with sign-offs.
- **Confidence:** Partly verified. The only sources are vendor pages, with no standards body or textbook. The page I opened did not use the terms "route card" or "router".

## 10. Theory of constraints

- **Concept:** Theory of constraints. Field: operations management.
- **Who and when:** Eliyahu Goldratt, *The Goal* (1984). The Wikipedia reference list cites the 1986 North River Press edition.
- **What it says:** The constraint limits system output. The five focusing steps are:
  1. Identify the constraint.
  2. Exploit it.
  3. Subordinate everything else to that decision.
  4. Elevate the constraint.
  5. If it is broken, go back to step 1 and don't let inertia set in.

  The first action is to identify the constraint, then get the most out of it before adding capacity. Drum-buffer-rope scheduling comes from Goldratt and Fox, *The Race* (1986).
- **Worth quoting:** The five steps as listed above, from Wikipedia.
- **Sources:** [Theory of constraints (Wikipedia)](https://en.wikipedia.org/wiki/Theory_of_constraints)
- **Confidence:** Partly verified. The only source I opened is secondary. I did not find a Goldratt Institute primary page.

## 11. Design for manufacture and assembly

- **Concept:** Design for assembly (DFA) and design for manufacture and assembly (DFMA). Field: product design.
- **Who and when:** Geoff Boothroyd began DFA in 1977 at UMass Amherst with NSF support. Peter Dewhurst joined for a computerized version in 1981. Their book *Product Design for Manufacture and Assembly* has editions in 1989, 1994, and 2002. Wikipedia reports Ford crediting the software with savings approaching $1 billion in 1988.
- **What it says:** Reduce part count, and design parts so they cannot be installed incorrectly. Search-result summaries of lecture slides cite these principles, attributed to Boothroyd and Dewhurst (1989):
  - "Maximise part symmetry if possible or make parts obviously asymmetric".
  - "Design parts that cannot be installed incorrectly".
  - Design parts to be self-aligning and self-locating.
- **Worth quoting:** The three principles above, as secondary wording only.
- **Sources:**
  - [Design for assembly (Wikipedia)](https://en.wikipedia.org/wiki/Design_for_assembly)
  - The principle wording is from lecture slides, which I did not open successfully.
- **Confidence:** Partly verified. The history is verified in Wikipedia. The guideline wording is unverified against the Boothroyd text. The MIT PDF was unreadable.

## 12. Statistical process control: common versus special causes

- **Concept:** Statistical process control and the two kinds of variation. Field: quality engineering.
- **Who and when:** Walter Shewhart, Bell Labs. His memo of 16 May 1924 included "a sketch of a modern control chart". His 1931 book is *Economic Control of Quality of Manufactured Product* (Van Nostrand). Deming edited Shewhart's 1939 lectures into *Statistical Method from the Viewpoint of Quality Control*.
- **What it says:** Shewhart split variation into chance causes and assignable causes. The control chart tells them apart. Deming's later terms are common and special causes. A point outside the limits means "we would be searching for an assignable cause" (NIST).
- **Worth quoting:** The NIST phrase above.
- **Sources:**
  - [6.1.1 How did Statistical Quality Control Begin? (NIST/SEMATECH e-Handbook of Statistical Methods)](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc11.htm)
  - [6.3.1 What are Control Charts? (NIST/SEMATECH e-Handbook of Statistical Methods)](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)
- **Confidence:** Verified for the Shewhart history and the assignable-cause idea. The NIST page does not use "common cause". Per commentary seen only in search results, Deming's and Shewhart's definitions are not identical, because Deming treats special causes as external events. I did not verify that in primary texts.

## Concepts not researched

I did not research these. Each comes from general knowledge, and each name and date is unverified here.

- **Source inspection and successive and self-checks** (Shingo): these are already in entry 3 and fit idea 2.
- **First article inspection and process capability (Cp/Cpk):** these ask whether a process can hold the tolerance before running volume. This is unverified here.
- **Kitting and error-proof fixtures, jigs and fixtures:** these fit "the piece carries the knowledge". This is unverified here.
- **FMEA (failure modes and effects analysis):** it ranks which failure modes the gauge is blind to. This is unverified here.
- **Control plans, with a gauge's detection capability:** FMEA and AIAG documents rate how well a control detects a failure. This is unverified here.

## Where sources contradict the popular version

- **Ford 12.5 h to 93 min:** the baseline and the unit (elapsed time versus man-minutes) vary by source. See entry 2.
- **Whitney as father of interchangeable parts:** the Wikipedia article reports historians crediting Hall or North instead.
- **1-10-100:** it is widely quoted as an established rule. I found no data behind it.
- **AIAG 10% and 30% Gage R&R bands:** they are widely quoted as pass/fail. The AIAG manual itself says not to use them alone as thresholds.
- **Deming versus Shewhart on cause definitions:** the sources disagree on whether the terms are equivalent.
