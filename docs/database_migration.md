# Database design and migration scripts

## Design Choices (in progress)

- No enum since it's hard to map Java to PostgreSQL enum; handled in the application layer.
- No second auto-update timestamp; handled in the application layer.
- Email validation handled in the application layer (frontend actually).
- Partial unique index in `document_requests` to prevent duplicate `PENDING` or `ACCEPTED` requests for the same user/paper.
- `SERIAL` is old but acceptable; maps easily in Java using `integer`.

<!-- prettier-ignore-start -->
!!! note

    - Every design change (new, fix, or improvement) must be documented (WHY).
    - In production, all schema changes must be versioned and applied via proper migration scripts.
    - In development, complete schema rewrites are allowed temporarily.
<!-- prettier-ignore-end -->

---

## V1\_\_initial_schema.sql

These are all the table schema including its indexes.

```sql
-- DEPARTMENTS
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- USERS
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    profile_picture_url VARCHAR(500) NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
    department_id INT NULL REFERENCES departments(department_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Index for fast department-based lookups
CREATE INDEX idx_users_department ON users(department_id);

-- RESEARCH PAPERS
CREATE TABLE research_papers (
    paper_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    abstract_text TEXT NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    department_id INT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
    submission_date DATE NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes for filtering & RBAC queries
CREATE INDEX idx_papers_department ON research_papers(department_id);
CREATE INDEX idx_papers_submission_date ON research_papers(submission_date);
CREATE INDEX idx_papers_archived ON research_papers(archived);

-- DOCUMENT REQUESTS
CREATE TABLE document_requests (
    request_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    paper_id INT NOT NULL REFERENCES research_papers(paper_id) ON DELETE CASCADE,
    request_date TIMESTAMP NOT NULL DEFAULT now(),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    rejection_reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_requests_user ON document_requests(user_id);
CREATE INDEX idx_requests_paper ON document_requests(paper_id);
CREATE INDEX idx_requests_created_at ON document_requests(created_at);
CREATE INDEX idx_requests_updated_at ON document_requests(updated_at);

-- Partial unique index to prevent duplicate PENDING or ACCEPTED requests for same user/paper
CREATE UNIQUE INDEX idx_unique_pending_accepted_request
ON document_requests(user_id, paper_id)
WHERE status IN ('PENDING', 'ACCEPTED');

CREATE TABLE refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    last_used_at TIMESTAMP NULL
);
```

---

## V2\_\_populate_departments.sql

> idk the schools departments :(

```sql
INSERT INTO departments (department_name)
VALUES
  ('Computer Science'),
  ('Mechanical Engineering'),
  ('Physics'),
  ('Chemistry'),
  ('Business Administration');
```

---

<!-- prettier-ignore-start -->
!!! warning "MOCKS"
    These are mocks or fake data.
    **This is what you see when testing the system**. Its not exactly hardcoded but just an sql script.
    Note that these are just meta data and have no files asscociated with it.

<!-- prettier-ignore-end -->

## V3\_\_populate_papers.sql

> AI generated data (fake).

```sql
INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Scalable Byzantine Fault Tolerance in Permissioned Blockchains', 'Alice Smith, John Doe', 'As decentralized systems transition from public to private sectors, the need for scalable consensus mechanisms grows. This paper introduces a sharded Byzantine Fault Tolerance (BFT) protocol that achieves 50,000 transactions per second under 30% node failure scenarios. We provide a rigorous mathematical proof of safety and liveness.', '/files/cs/blockchain_scalability_final.pdf', 1, '2024-02-14', FALSE, NOW(), NOW()),
('Edge Computing: A Survey', 'Bob Zhang', 'Short overview of edge computing paradigms.', '/files/cs/edge_survey.pdf', 1, '2023-11-05', TRUE, '2023-11-05 09:00:00', NOW()),
('Generative Adversarial Networks for Synthetic Financial Data', 'Carol Johnson, Mark Specter', 'The scarcity of labeled financial data remains a bottleneck for machine learning in fintech. This research proposes "FinGAN," a generative model capable of synthesizing realistic stock market volatility patterns while strictly adhering to privacy-preserving constraints. Our results show that models trained on FinGAN data perform within 2% accuracy of those trained on real-world datasets.', '/files/cs/fin_gan_v2.pdf', 1, '2025-01-10', FALSE, NOW(), NOW()),
('On the Complexity of Non-Deterministic Polynomial Time', 'David Kim', 'A brief reconsideration of P vs NP boundaries in specific graph-theoretic constraints.', '/files/cs/p_vs_np_notes.pdf', 1, '2022-05-20', TRUE, '2022-05-20 14:00:00', NOW()),
('Human-Computer Interaction in Virtual Reality Surgical Simulators', 'Emma Turner, Sarah Vance', 'This study investigates the tactile feedback latency thresholds for surgeons using VR tools. By testing 50 resident surgeons, we identified that latencies above 15ms significantly degrade the precision of arterial suturing. We propose a predictive haptic rendering algorithm to mask network jitter.', '/files/cs/vr_surgery_haptics.pdf', 1, '2024-09-12', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Topology Optimization of 3D Printed Aerospace Brackets', 'Frank Miller', 'Weight reduction in aerospace components is critical for fuel efficiency. This paper utilizes a density-based topology optimization approach to redesign standard titanium brackets. The resulting lattice structures provide a 40% weight reduction while maintaining a safety factor of 1.5.', '/files/me/topo_opt_aero.pdf', 2, '2024-03-22', FALSE, NOW(), NOW()),
('Thermal Management of High-Density Lithium-Ion Battery Packs', 'Grace Lee, Henry Ford III', 'Lithium-ion batteries are prone to thermal runaway. We present a hybrid cooling system combining phase-change materials (PCM) with active liquid cooling. Experimental results demonstrate a 15-degree Celsius reduction in peak temperature during fast-charging cycles (4C rate).', '/files/me/battery_thermal_2024.pdf', 2, '2024-06-18', FALSE, NOW(), NOW()),
('Micro-Actuator Design', 'Ishaan Kumar', 'Preliminary study on piezo-electric actuators for small-scale robotics.', '/files/me/micro_actuator_draft.pdf', 2, '2021-12-01', TRUE, '2021-12-01 10:00:00', NOW()),
('Aerodynamics of Flapping Wing Micro-Air Vehicles', 'Julia Morgan', 'Bio-inspired flight mechanisms.', '/files/me/mav_flapping.pdf', 2, '2024-11-20', FALSE, NOW(), NOW()),
('Fatigue Life Prediction of Welded Joints in Offshore Wind Turbines', 'Kevin Chen', 'Offshore structures face extreme cyclic loading. This paper reviews the S-N curve methodology versus fracture mechanics approaches for predicting the remaining useful life of welded tubular joints. We introduce a modified Paris Law model that accounts for saltwater corrosion rates.', '/files/me/wind_turbine_fatigue.pdf', 2, '2023-08-14', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Muon g-2 Anomalies: A Path to New Physics?', 'Mohammed Salah', 'Recent measurements of the muon magnetic anomaly suggest a discrepancy with the Standard Model. This paper explores the possibility of a dark photon mediator explaining the 4.2-sigma deviation observed at Fermilab.', '/files/ph/muon_anomaly_study.pdf', 3, '2024-01-05', FALSE, NOW(), NOW()),
('High-Temperature Superconductivity in Hydrides', 'Oscar Fernandez', 'Observation of zero-resistance states in sulfur-hydride systems under pressures exceeding 150 GPa. While room temperature remains elusive, these findings pave the way for ambient-pressure applications via chemical pre-compression.', '/files/ph/supercond_hydride.pdf', 3, '2024-07-29', FALSE, NOW(), NOW()),
('Black Hole Information Paradox: A Firewall Perspective', 'Natalie Young', 'Does an observer falling into a black hole see a firewall? This theoretical analysis synthesizes the AMPS paradox with modern AdS/CFT correspondence theories to suggest that unitarity requires a radical rethinking of the event horizon.', '/files/ph/blackhole_firewall.pdf', 3, '2023-10-15', FALSE, NOW(), NOW()),
('Solar Flare Forecasting', 'Kevin Walker', 'Using X-ray flux data to predict M-class solar flares.', '/files/ph/solar_flares.pdf', 3, '2020-05-12', TRUE, '2020-05-12 11:00:00', NOW()),
('Neutrino Oscillation Parameters in Long-Baseline Experiments', 'Laura Palmer', 'Final results from the 5-year study on neutrino flavor mixing.', '/files/ph/neutrino_final.pdf', 3, '2024-12-01', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Green Synthesis of Silver Nanoparticles using Eucalyptus Leaf Extract', 'Priya Singh, Anil Kapur', 'We report a cost-effective and eco-friendly method for the synthesis of silver nanoparticles (AgNPs). The plant metabolites act as both reducing and stabilizing agents. Characterization via UV-Vis and TEM confirms a spherical morphology with an average size of 20nm.', '/files/ch/green_nano_silver.pdf', 4, '2024-05-14', FALSE, NOW(), NOW()),
('Total Synthesis of Macrolide Antibiotics', 'Rachel Adams', 'An 18-step total synthesis of a novel macrolide.', '/files/ch/macrolide_synth.pdf', 4, '2023-02-10', TRUE, '2023-02-10 08:30:00', NOW()),
('Machine Learning in Retrosynthetic Analysis', 'Samuel Yeo', 'Can AI replace the chemist in route planning? We evaluate three transformer-based models on their ability to predict precursor molecules for complex natural products. Accuracy reached 78% for known reactions but dropped to 12% for novel bond-forming strategies.', '/files/ch/ml_retrosynthesis.pdf', 4, '2024-08-03', FALSE, NOW(), NOW()),
('Electrochemical Detection of Heavy Metals in Urban Waterways', 'Teresa van Dijk', 'Modified carbon paste electrodes for lead detection.', '/files/ch/heavy_metal_sensors.pdf', 4, '2024-10-10', FALSE, NOW(), NOW()),
('CO2 Capture via Metal-Organic Frameworks (MOFs)', 'Quentin Brooks', 'The climate crisis necessitates efficient carbon sequestration. This paper presents a novel MOF with an unprecedented surface area of 7000 m2/g, showing a 30% increase in CO2 adsorption capacity compared to HKUST-1.', '/files/ch/mof_carbon_capture.pdf', 4, '2024-12-15', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('The Gig Economy and Worker Well-being: A Longitudinal Study', 'Wendy Liu', 'As platform-based work becomes the norm, concerns regarding job security and mental health have surfaced. This three-year study of 2,000 Uber and DoorDash drivers suggests that while flexibility is valued, the lack of benefits leads to a 20% higher burnout rate compared to traditional employment.', '/files/ba/gig_economy_health.pdf', 5, '2024-04-11', FALSE, NOW(), NOW()),
('Corporate Social Responsibility or Greenwashing?', 'Victor Chang', 'Analysis of ESG reports from Fortune 500 companies.', '/files/ba/csr_vs_greenwashing.pdf', 5, '2023-09-30', FALSE, NOW(), NOW()),
('AI-Driven Dynamic Pricing in E-commerce', 'Uma Patel', 'How algorithms adjust prices in real-time.', '/files/ba/dynamic_pricing_v1.pdf', 5, '2022-01-15', TRUE, '2022-01-15 16:20:00', NOW()),
('The Impact of Remote Work on Organizational Culture', 'Xavier Perez, Yasmin Said', 'Is the "water cooler" conversation essential for innovation? Through a mixed-methods approach involving 15 tech firms, we found that while individual productivity rose by 10% during remote work, inter-departmental collaboration decreased by 25%.', '/files/ba/remote_work_culture.pdf', 5, '2024-06-25', FALSE, NOW(), NOW()),
('Venture Capital Trends in Southeast Asia', 'Lee Min-ho', 'A report on the shift from fintech to agritech investments in the ASEAN region.', '/files/ba/vc_trends_asean.pdf', 5, '2024-11-02', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Transformer-XL: Beyond Fixed-Length Context Windows in Natural Language Understanding', 'Dr. Aris Thorne, Sarah Jenkins',
'State-of-the-art language models are often limited by a fixed-length context window, which prevents the capture of long-range dependencies in extensive documents. This paper proposes a novel architecture that integrates a segment-level recurrence mechanism and a relative positional encoding scheme. Our evaluations on the WikiText-103 dataset demonstrate that our model achieves a perplexity of 18.3, outperforming standard Transformers by 15%. By reusing hidden states from previous segments, we enable the model to attend to information up to 450% further than traditional self-attention mechanisms. This advancement is critical for applications in long-form document summarization and legal tech analysis.',
'/files/cs/transformer_xl_deep_dive.pdf', 1, '2025-05-12', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Computational Fluid Dynamics Analysis of Drag Reduction in Heavy-Duty Vehicles', 'Marcus Vane, Linda Green',
'Aerodynamic drag accounts for approximately 65% of fuel consumption in Class 8 heavy-duty trucks at highway speeds. This study utilizes Reynolds-Averaged Navier-Stokes (RANS) simulations to evaluate the efficacy of active flow control systems, specifically synthetic jet actuators placed at the trailer tail. Computational results indicate that by manipulating the wake turbulence and delaying boundary layer separation, a net drag reduction of 12% is achievable. We provide a cost-benefit analysis comparing the energy expenditure of the actuators against the projected fuel savings of 4.5 gallons per 1,000 miles. These findings suggest that active aerodynamic surfaces are a viable alternative to passive fairings for long-haul logistics.',
'/files/me/cfd_truck_aerodynamics.pdf', 2, '2024-09-30', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Error Mitigation Strategies in Noisy Intermediate-Scale Quantum (NISQ) Devices', 'Prof. Elena Rossi',
'The current generation of quantum processors is plagued by high decoherence rates and gate errors, necessitating robust error mitigation before full fault-tolerant computing is realized. This research focuses on Zero-Noise Extrapolation (ZNE) and Probabilistic Error Cancellation (PEC) techniques implemented on a 54-qubit superconducting processor. We demonstrate that by systematically scaling noise levels and extrapolating to the noiseless limit, we can improve the fidelity of VQE-based molecular simulations by up to 22%. However, the sampling overhead increases exponentially with the depth of the circuit. This paper proposes a hybrid mitigation-correction protocol that balances computational runtime with result accuracy for near-term quantum supremacy tasks.',
'/files/ph/quantum_error_mitigation.pdf', 3, '2025-11-04', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Heterogeneous Catalysis for the Valorization of Lignocellulosic Biomass', 'Dr. Robert Moore, Jordan Bell',
'The transition to a bio-based economy requires the efficient conversion of non-edible biomass into platform chemicals. This paper details the development of a bifunctional ruthenium-based catalyst supported on activated carbon for the hydrogenolysis of lignin. Through a series of batch reactor experiments, we achieved a 72% yield of phenolic monomers at 250°C and 40 bar of H2 pressure. Kinetic studies reveal that the catalyst maintains high selectivity toward 4-propylguaiacol, with minimal carbon coking observed after five consecutive cycles. This research highlights a significant step toward replacing petroleum-derived aromatics with renewable alternatives derived from agricultural waste.',
'/files/ch/biomass_catalysis_vFinal.pdf', 4, '2024-06-18', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Resilience Benchmarking in Global Supply Chains: A Post-Pandemic Analysis', 'Sofia Rodriguez, Michael Bloomberg Jr.',
'The unprecedented disruptions of the early 2020s exposed the fragility of "Just-in-Time" inventory systems. This study proposes a Multi-Criteria Decision-Making (MCDM) framework to quantify supply chain resilience across the electronics and pharmaceutical sectors. We analyze data from 120 global firms, measuring key performance indicators such as Time-to-Recover (TTR) and Time-to-Survive (TTS). Our findings indicate that firms with diversified geographic sourcing and high digital visibility experienced 40% shorter recovery times during port closures. The paper argues for a strategic shift toward "Just-in-Case" models and the integration of AI-driven predictive analytics to anticipate regional geopolitical risks.',
'/files/ba/supply_chain_resilience_2025.pdf', 5, '2023-11-20', TRUE, '2023-11-20 09:15:00', NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Adaptive Sharding Protocols for High-Throughput Distributed Ledgers', 'Dr. Katherine Singh, Liam O’Reilly',
'As blockchain networks scale toward global adoption, the trilemma of security, scalability, and decentralization remains a significant hurdle. This paper introduces "Aegis-Shard," a dynamic sharding protocol that reconfigures network partitions based on real-time transaction density and node churn. Unlike static sharding, which is vulnerable to 1% attacks on individual shards, Aegis-Shard utilizes a verifiable random function (VRF) to shuffle validators across shards every epoch. Our experimental results, conducted on a global testnet of 2,000 nodes, demonstrate a sustained throughput of 85,000 transactions per second (TPS) with sub-second finality. Furthermore, we analyze the cross-shard communication overhead and propose a "Receipt-Based" asynchronous atomic commit protocol that reduces inter-shard latency by 40%. The study concludes that adaptive sharding is essential for supporting CBDCs and high-frequency decentralized exchanges.',
'/files/cs/aegis_shard_ledger.pdf', 1, '2025-06-12', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Influence of Laser Powder Bed Fusion (LPBF) Parameters on Porosity in Ti-6Al-4V', 'Jameson Burke, Dr. Sarah Miller',
'Additive manufacturing of titanium alloys like Ti-6Al-4V has revolutionized the production of custom medical implants and lightweight aerospace components. However, the formation of gas pores and "lack-of-fusion" voids remains a critical challenge for fatigue-sensitive applications. This research systematically investigates the relationship between laser power (150W–400W), scan speed (500mm/s–1500mm/s), and hatch spacing on the resultant densification. Through high-resolution X-ray computed tomography (XCT) and Archimedes density measurements, we identified a "conduction-mode" window that yields parts with >99.8% relative density. We also observe that excessive energy density leads to "keyhole" porosity, which significantly degrades the elongation-at-break from 12% to 4%. This paper provides a comprehensive process map for operators to optimize microstructure and mechanical properties during the LPBF process.',
'/files/me/titanium_lpbf_porosity.pdf', 2, '2025-02-18', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Topological Insulators and the Emergence of Majorana Fermions in Hybrid Nanowires', 'Prof. Viktor Volkov, Chen Ruo',
'The search for Majorana bound states (MBS) is driven by their potential application in topologically protected quantum computing. In this work, we report on transport measurements of InAs/Al hybrid nanowire devices under strong longitudinal magnetic fields. By tuning the chemical potential via a back-gate, we observed a zero-bias conductance peak (ZBCP) that persists over a significant range of magnetic fields and gate voltages, a hallmark signature of MBS. We contrast these findings with trivial Andreev bound states induced by disorder and provide a theoretical model based on the Bogoliubov-de Gennes equations to interpret the data. Our results suggest that while the ZBCP is a necessary indicator, future braiding experiments are required to confirm non-Abelian statistics. This research advances the understanding of topological phases in semiconductor-superconductor interfaces.',
'/files/ph/majorana_fermion_transport.pdf', 3, '2025-10-05', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Photochemical Degradation of Tropospheric Ozone via Mineral Dust Aerosols', 'Dr. Elena Martinez, Omar Al-Zahrani',
'Mineral dust is one of the most abundant aerosol types in the atmosphere, yet its role as a reactive surface for trace gas depletion is often underrepresented in global climate models. This study investigates the heterogeneous uptake of ozone (O3) on various mineral proxies, including kaolinite, montmorillonite, and Saharan dust samples, using a Knudsen cell reactor. Our findings reveal that the uptake coefficient is highly dependent on relative humidity (RH), with a 50% decrease in reactivity as RH increases from 0% to 75% due to competitive water adsorption. Spectroscopic analysis via Diffuse Reflectance Infrared Fourier Transform (DRIFTS) identifies the formation of surface-bound superoxide and peroxide species as intermediate reaction products. This research suggests that dust plumes can significantly alter local ozone concentrations in arid regions, impacting both air quality and radiative forcing calculations.',
'/files/ch/ozone_dust_photochem.pdf', 4, '2024-11-30', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Nudge Theory and Consumer Debt: A Field Experiment on Credit Card Repayment', 'Maya Gupta, Dr. Simon Wright',
'High-interest consumer debt remains a significant economic burden for millions of households. This paper presents the results of a large-scale randomized controlled trial (RCT) involving 15,000 credit card holders to test the efficacy of behavioral "nudges" in increasing monthly repayments. We implemented three treatment groups: a "Peer Comparison" nudge, a "Future Self" visualization, and an "Interest Salience" warning. Our analysis shows that the Interest Salience group—which received a clear breakdown of the long-term cost of making only minimum payments—increased their average monthly payment by 18.5% compared to the control group. Interestingly, the Peer Comparison nudge showed diminishing returns among high-income earners. This study provides empirical evidence for the use of choice architecture in financial services and offers policy recommendations for consumer protection bureaus to mandate more transparent disclosure formats.',
'/files/ba/nudge_theory_debt.pdf', 5, '2025-08-22', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Mitigating Algorithmic Bias in Neural Ranking Models for Recruitment', 'Dr. Amara Okafor, Leo Schmidt',
'Automated recruitment systems often inherit historical biases present in training data, leading to the systemic exclusion of marginalized groups. This paper proposes a "Fair-Rank" framework that integrates a constrained optimization layer into the loss function of a Transformer-based ranker. By utilizing a demographic parity constraint during the fine-tuning phase on the LinkedIn-P dataset, we achieved a 40% reduction in disparate impact without significantly compromising the Normalized Discounted Cumulative Gain (NDCG). We further analyze the trade-off between model utility and fairness metrics, providing a Pareto-optimal frontier for HR-tech developers. The study concludes that adversarial debiasing is more effective than simple data re-sampling for long-tail distribution shifts in professional profiles.',
'/files/cs/fair_rank_bias_mitigation.pdf', 1, '2025-10-14', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Hypersonic Boundary Layer Transition on a Blunted Cone at Mach 10', 'Jean-Pierre Laurent, Dr. Sarah Miller',
'Predicting the transition from laminar to turbulent flow is critical for the thermal protection system (TPS) design of hypersonic re-entry vehicles. This research utilizes Direct Numerical Simulation (DNS) to investigate the evolution of Second-mode (Mack) instabilities on a 7-degree half-angle blunted cone. Our simulations, conducted on a 1.2-billion cell grid, reveal that nose bluntness exerts a stabilizing effect by thickening the shock layer and modifying the entropy gradient. We present a modified e^N transition model that accounts for the bluntness-induced damping of high-frequency acoustic waves. Comparisons with experimental wind tunnel data at Mach 10 show an 85% correlation in the predicted transition location. This work provides high-fidelity data for the next generation of scramjet-powered vehicle design.',
'/files/me/hypersonic_mach10_dns.pdf', 2, '2025-04-05', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Background Characterization for Liquid Argon Time Projection Chambers (LArTPC)', 'Hiroki Sato, Dr. Elena Rossi',
'Deep-underground neutrino experiments, such as DUNE, rely on Liquid Argon Time Projection Chambers (LArTPC) to detect rare neutrino interactions with unprecedented spatial resolution. However, cosmic-ray induced neutrons and radioactive isotopes like Argon-39 present significant background challenges. This paper details a 12-month background study conducted at the Sanford Underground Research Facility (SURF). We developed a machine-learning-based pulse-shape discrimination (PSD) algorithm to differentiate between electronic and nuclear recoils. Our results demonstrate a rejection power of 10^7 for beta particles while maintaining 95% efficiency for neutrino signal candidates. We also provide a comprehensive map of the thermal neutron flux within the cryostat, which is essential for future searches for supernova burst neutrinos and proton decay.',
'/files/ph/lartpc_background_dune.pdf', 3, '2025-01-22', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Single-Molecule SERS Detection using Plasmonic Nanoparticle-on-Mirror Geometries', 'Dr. Robert Moore, Isabella Conti',
'Surface-Enhanced Raman Spectroscopy (SERS) has reached the ultimate limit of analytical sensitivity, enabling the detection of individual molecules. This study utilizes a "Nanoparticle-on-Mirror" (NPoM) architecture, where gold nanospheres are separated from a flat gold film by a 1.2 nm thick self-assembled monolayer (SAM). This geometry creates a sub-nanometer "hotspot" where the local electromagnetic field enhancement factor exceeds 10^10. By monitoring the fluctuations of the 1640 cm^-1 vibrational mode of Rhodamine 6G, we demonstrate the capture and release of single molecules within the plasmonic gap. We analyze the spectral "blinking" and line-broadening effects as a function of incident laser power. This research paves the way for ultra-sensitive point-of-care diagnostics and the study of molecular electronics in real-time.',
'/files/ch/sers_single_molecule_npom.pdf', 4, '2025-09-02', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Equilibrium Analysis of Automated Market Makers (AMM) in Decentralized Finance', 'Xavier Perez, Dr. Simon Wright',
'Automated Market Makers (AMMs), such as Uniswap, have redefined liquidity provision by replacing order books with mathematical bonding curves. This paper explores the game-theoretic equilibrium between liquidity providers (LPs) and arbitrageurs in a Constant Product Market Maker (CPMM) model. We derive a closed-form solution for "Impermanent Loss" (IL) under stochastic price volatility and propose a dynamic fee-switching mechanism to hedge against LVR (Loss-Versus-Rebalancing). Using historical data from Ethereum-based DEXs, we show that our proposed dynamic fee model increases LP profitability by 15% during high-volatility regimes without reducing total trading volume. The paper concludes with an analysis of MEV (Maximal Extractable Value) and its impact on price slippage for retail participants.',
'/files/ba/amm_equilibrium_defi.pdf', 5, '2025-12-01', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Quantum Entanglement Distribution in Satellite-to-Ground Links', 'Dr. Helena Ray, Dr. Marcus Thorne', 'The realization of a global quantum internet depends heavily on the ability to distribute entangled photons across long distances. This paper analyzes the atmospheric turbulence effects on polarization-entangled photon pairs transmitted from a Low Earth Orbit (LEO) satellite. We demonstrate a robust error-correction protocol that maintains a Bell-state fidelity above 0.85 despite significant scintillation, paving the way for secure intercontinental quantum key distribution.', '/files/physics/quantum_satellite_final.pdf', 3, '2024-05-12', FALSE, NOW(), NOW()),
('Investigation of Muon Flux Variability in High-Altitude Observatories', 'Leo Takahashi', 'Short report on cosmic ray muon counts at 4000m elevation.', '/files/physics/muon_flux_notes.pdf', 3, '2023-01-15', TRUE, '2023-01-15 11:30:00', NOW()),
('Phonon Scattering in Low-Dimensional Semiconductor Superlattices', 'Sophia Aris, Julian Becker', 'Thermal management in nanoscale electronics is limited by phonon transport. In this work, we employ Molecular Dynamics (MD) simulations to study phonon-interface scattering in GaAs/AlAs superlattices. Our findings reveal that interface roughness can be engineered to reduce thermal conductivity below the amorphous limit, which has profound implications for the efficiency of thermoelectric energy harvesting devices.', '/files/physics/phonon_scattering_2024.pdf', 3, '2024-10-02', FALSE, NOW(), NOW()),
('Superconductivity in Twist-Angle Graphene Layers', 'Elena Rossi', 'A study of Moiré patterns and electronic correlation at the magic angle.', '/files/physics/graphene_super_v1.pdf', 3, '2024-08-19', FALSE, NOW(), NOW()),
('Gravitational Wave Signature Analysis of Binary Black Hole Mergers', 'Victor Vance, Linda Choi', 'With the increasing sensitivity of interferometers, distinguishing between different black hole populations is becoming possible. This research utilizes Bayesian inference to analyze the ringdown phase of gravitational wave signals. We provide a new constraint on the "no-hair theorem" by measuring the sub-dominant quasi-normal modes in events GW190521 and GW190814, suggesting a consistency with General Relativity within a 95% confidence interval.', '/files/physics/gw_merger_analysis.pdf', 3, '2025-02-11', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Synthesis of Metal-Organic Frameworks for Carbon Capture', 'Dr. Ahmed Al-Farsi, Sarah Jenkins', 'Atmospheric CO2 levels necessitate the development of high-capacity sorbents. We report the synthesis of a novel Cr-based Metal-Organic Framework (MOF), designated "MOF-XYZ," which exhibits a surface area of 4,500 m²/g. The material shows exceptional selectivity for CO2 over N2 in flue gas conditions. Breakthrough curve analysis indicates that the framework can be regenerated over 100 cycles without significant loss in structural integrity or adsorption capacity.', '/files/chem/mof_carbon_capture.pdf', 4, '2024-03-30', FALSE, NOW(), NOW()),
('Kinetics of Enzyme Catalysis', 'Brian O''Conner', 'Preliminary lab notes on lipase reaction rates in aqueous solutions.', '/files/chem/enzyme_notes.pdf', 4, '2022-09-10', TRUE, '2022-09-10 16:45:00', NOW()),
('Total Synthesis of Marine Alkaloids via C-H Activation', 'Yuki Tanaka, Robert Mueller', 'Natural products from marine sponges offer potential for anti-tumor therapies. This paper details the 12-step total synthesis of Nortopsentin D using a palladium-catalyzed C-H activation strategy. By bypassing traditional functional group interconversions, we improved the overall yield by 15% compared to previous methodologies. Initial bioassays show significant inhibition of breast cancer cell lines (MCF-7) with low micromolar IC50 values.', '/files/chem/alkaloid_synthesis_final.pdf', 4, '2024-11-15', FALSE, NOW(), NOW()),
('Electrochemical Properties of Sodium-Ion Battery Anodes', 'Chloe Williams', 'Comparative study of hard carbon vs. graphite for Na-ion storage.', '/files/chem/sodium_battery_anodes.pdf', 4, '2023-07-22', FALSE, NOW(), NOW()),
('Degradation of Microplastics via Photocatalytic TiO2 Nanoparticles', 'Maria Garcia, Paul Stein', 'The accumulation of microplastics in aquatic environments is a global crisis. We investigate the use of UV-irradiated TiO2 nanoparticles to accelerate the oxidative degradation of polyethylene and polystyrene fragments. SEM and FTIR analysis confirm significant surface pitting and chain scission after 48 hours of exposure. This research suggests a scalable pathway for treating wastewater effluent before it reaches oceanic ecosystems.', '/files/chem/microplastic_uv_study.pdf', 4, '2025-01-05', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('The Impact of Remote Work on Organizational Culture and Productivity', 'Dr. Karen White, James Liao', 'The rapid shift to remote work has redefined the traditional workplace. This study utilizes a mixed-methods approach, combining surveys from 1,200 tech employees with longitudinal performance data. We find that while individual productivity remained stable or increased, long-term organizational social capital declined by 22% due to reduced "weak tie" interactions. We propose a hybrid framework to balance operational efficiency with cultural cohesion.', '/files/biz/remote_work_impact.pdf', 5, '2024-04-18', FALSE, NOW(), NOW()),
('Cryptocurrency Volatility Study', 'Tom Hiddleston', 'Brief analysis of Bitcoin price swings in Q4 2023.', '/files/biz/crypto_volatility.pdf', 5, '2023-12-20', TRUE, '2023-12-20 10:00:00', NOW()),
('Sustainable Supply Chain Management in the Fast Fashion Industry', 'Isabella Costa, Liam Neeson', 'Fast fashion brands face mounting pressure to adopt ESG standards. This paper examines the supply chain transparency of five major retailers. Using a triple-bottom-line assessment, we identify that the primary barrier to sustainability is the lack of tier-2 and tier-3 supplier visibility. We recommend the implementation of blockchain-based tracking systems to verify labor conditions and material sourcing authenticity.', '/files/biz/sustainable_fashion_chains.pdf', 5, '2024-08-30', FALSE, NOW(), NOW()),
('Consumer Behavior in the Subscription Economy', 'Patricia Holm', 'Analysis of churn rates in SaaS and streaming platforms.', '/files/biz/subscription_behavior.pdf', 5, '2024-02-05', FALSE, NOW(), NOW()),
('Nudging Financial Literacy: A Behavioral Economics Approach', 'Richard Thaler Jr., Monica Geller', 'Traditional financial education often fails to change long-term saving habits. This research implements a "choice architecture" intervention in a corporate 401(k) plan. By making the default contribution rate 6% and implementing an "auto-escalate" feature, participation rates rose from 45% to 88% over an 18-month period. The study concludes that behavioral nudges are more effective than classroom-style seminars for retirement readiness.', '/files/biz/nudge_finance_study.pdf', 5, '2025-01-25', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('High-Temperature Superconductivity in Hydride Compounds under Extreme Pressure', 'Dr. Aris Thorne, Elena M. Vance', 'The quest for room-temperature superconductivity has shifted toward hydrogen-rich materials. This paper investigates the structural and electronic properties of Lanthanum Decahydride (LaH10) at pressures exceeding 150 GPa. Using density functional theory (DFT) calculations, we predict a superconducting transition temperature (Tc) of 260 K. Our experimental data confirms a sharp drop in electrical resistance, providing a blueprint for the next generation of near-ambient temperature superconductors.', '/files/physics/hydride_superconductor_2025.pdf', 3, '2025-03-12', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Direct Air Capture of CO2 Using Amine-Functionalized Cellulose Nanofibrils', 'Dr. Simon Choi, Linda Park', 'Global decarbonization efforts require efficient Direct Air Capture (DAC) technologies. This study explores the synthesis of cellulose nanofibrils (CNF) modified with branched polyethyleneimine (PEI). We demonstrate that the hierarchical porosity of the CNF scaffold allows for rapid CO2 diffusion, achieving an adsorption capacity of 3.2 mmol/g under ambient conditions. The material exhibits high cyclic stability and low regeneration energy, making it a sustainable alternative to synthetic polymer supports.', '/files/chem/dac_cellulose_study.pdf', 4, '2024-11-20', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Zero-Knowledge Proofs for Privacy-Preserving Identity Verification', 'Kevin Zhang, Sarah J. Miller', 'As digital identity theft increases, there is a critical need for verification methods that do not expose sensitive user data. This paper proposes a novel zk-SNARKs construction optimized for mobile devices. Our protocol allows a user to prove they possess a valid government ID and meet age requirements without revealing their name or birthdate. Benchmarks show a 40% reduction in prover time compared to existing Groth16 implementations, making it feasible for real-time mobile authentication.', '/files/cs/zkp_identity_final.pdf', 1, '2025-01-15', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Characterization of Shape Memory Alloy Actuators for Soft Robotics', 'Marcus Aurelius, Julia Chen', 'Soft robotic systems require lightweight and high-force actuators. This research characterizes the thermomechanical response of Nitinol wires embedded in silicone elastomers. We develop a non-linear constitutive model that accounts for the hysteretic behavior of the alloy during phase transitions. Experimental results show that the integrated actuators can achieve a 30% strain at frequencies up to 2 Hz, enabling more lifelike locomotion in bio-inspired underwater vehicles.', '/files/me/sma_soft_robotics.pdf', 2, '2024-05-08', FALSE, NOW(), NOW());

INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
('Algorithmic Bias in Credit Scoring: A Longitudinal Analysis of Lending Equity', 'Dr. Rebecca Stone, David Wu', 'The automation of credit decisions through machine learning has raised concerns regarding systemic bias. This study analyzes a dataset of 2 million loan applications from 2018 to 2024. We find that while black-box models improve default prediction accuracy by 12%, they disproportionally penalize applicants from specific zip codes. We propose a "fairness-aware" regularization technique that minimizes disparate impact without significantly compromising the model''s Area Under the Curve (AUC).', '/files/biz/algo_bias_credit.pdf', 5, '2024-10-10', FALSE, NOW(), NOW());

-- BATCH 1: 20 RESEARCH PAPERS
INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
-- COMPUTER SCIENCE (ID: 1)
('Deep Reinforcement Learning for Autonomous Drone Navigation', 'Liam Archer, Sophia Chen', 'Navigating complex, unstructured environments remains a challenge for UAVs. This paper presents a novel deep Q-learning architecture that utilizes LiDAR and monocular vision fusion. Our model reduces collision rates by 34% in dense forest simulations compared to traditional PID-based obstacle avoidance systems.', '/files/cs/drone_rl_2024.pdf', 1, '2024-11-02', FALSE, NOW(), NOW()),
('Secure Multi-Party Computation in Healthcare Analytics', 'Dr. Aris Thorne', 'Privacy concerns often prevent hospitals from sharing data for research. We propose a framework based on Shamir’s Secret Sharing that allows multiple institutions to compute global disease statistics without revealing individual patient records. The overhead is optimized to handle datasets exceeding 1 million entries.', '/files/cs/secure_mpc_health.pdf', 1, '2024-05-19', FALSE, NOW(), NOW()),
('Optimization of Transformer Models for Edge Devices', 'Yuki Sato', 'Large Language Models (LLMs) are computationally expensive. This research explores 4-bit quantization and structural pruning techniques to deploy GPT-style architectures on ARM-based microcontrollers. Results indicate a 5x speedup in inference time with only a 1.2% loss in perplexity.', '/files/cs/edge_transformer_opt.pdf', 1, '2025-01-20', FALSE, NOW(), NOW()),
('Cyber-Physical System Vulnerabilities in Smart Grids', 'Marcus Vane', 'Analysis of packet injection attacks on SCADA systems.', '/files/cs/smart_grid_security.pdf', 1, '2023-04-12', TRUE, '2023-04-12 08:00:00', NOW()),

-- MECHANICAL ENGINEERING (ID: 2)
('Computational Fluid Dynamics of Hypersonic Re-entry Vehicles', 'Dr. Sarah Jenkins', 'Atmospheric re-entry at Mach 5+ creates extreme thermal loads. This study utilizes Navier-Stokes simulations to model the plasma sheath formation around a blunt-body capsule. We propose a new ablative material composition that increases heat shield longevity by 15%.', '/files/me/hypersonic_cfd_final.pdf', 2, '2024-09-30', FALSE, NOW(), NOW()),
('Vibration Analysis of High-Speed Rail Suspension Systems', 'Chen Wei, Robert Miller', 'Passenger comfort in high-speed rail is dictated by vertical and lateral vibration damping. This paper develops a 17-degree-of-freedom model of a Shinkansen-style bogie. We introduce an active electromagnetic damping system that reduces cabin noise by 8 decibels.', '/files/me/hsr_vibration_study.pdf', 2, '2024-12-05', FALSE, NOW(), NOW()),
('Tribological Properties of Graphene-Infused Lubricants', 'Elena Rossi', 'Friction reduction in internal combustion engines is vital for efficiency. We examine the wear-rate of steel-on-steel contacts when using 0.5% weight-ratio graphene nanoplatelets. Results show a significant reduction in the coefficient of friction and surface scarring.', '/files/me/graphene_lubricant.pdf', 2, '2024-03-14', FALSE, NOW(), NOW()),
('Design of a Modular Exoskeleton for Industrial Lifting', 'Kevin Adams', 'Ergonomic support for warehouse workers.', '/files/me/exoskeleton_design_v2.pdf', 2, '2023-08-22', FALSE, NOW(), NOW()),

-- PHYSICS (ID: 3)
('Detection of Dark Matter Candidates in Xenon-Based Detectors', 'Dr. Victor Vance', 'The nature of Dark Matter remains the greatest mystery in modern cosmology. This paper reports on the background rejection techniques used in the latest LUX-ZEPLIN run. We provide new constraints on WIMP-nucleon cross-sections, excluding several theoretical SUSY models.', '/files/physics/dark_matter_2024.pdf', 3, '2024-10-15', FALSE, NOW(), NOW()),
('Stellar Nucleosynthesis in Population III Stars', 'Ariel Castro', 'Using numerical simulations to model the first stars.', '/files/physics/pop_iii_stars.pdf', 3, '2022-11-30', TRUE, '2022-11-30 14:20:00', NOW()),
('Topological Insulators and Majoranan Fermions', 'Dr. Helena Ray', 'We investigate the proximity effect between a topological insulator and a superconductor. Our tunneling spectroscopy measurements reveal a zero-bias conductance peak, which serves as a signature for Majorana bound states, essential for fault-tolerant topological quantum computing.', '/files/physics/topological_insulators.pdf', 3, '2025-02-01', FALSE, NOW(), NOW()),
('Non-Linear Optics in Photonic Crystal Fibers', 'James T. Kirk', 'Study of supercontinuum generation using femtosecond lasers.', '/files/physics/pcf_optics.pdf', 3, '2024-07-11', FALSE, NOW(), NOW()),

-- CHEMISTRY (ID: 4)
('Kinetics of Hydrogen Evolution in Electrocatalytic Water Splitting', 'Maria Garcia', 'Transitioning to a hydrogen economy requires cheaper catalysts than Platinum. This research synthesizes Cobalt-based phosphides on carbon cloth. We report an overpotential of 90mV at 10mA/cm², demonstrating performance comparable to precious metal benchmarks in alkaline media.', '/files/chem/hydrogen_evolution_study.pdf', 4, '2024-06-25', FALSE, NOW(), NOW()),
('Aqueous-Phase Reforming of Biomass-Derived Polyols', 'Paul Stein', 'Converting sugar alcohols into green hydrogen.', '/files/chem/biomass_reforming.pdf', 4, '2023-01-05', TRUE, '2023-01-05 09:15:00', NOW()),
('Molecular Docking Studies of Novel Antiviral Compounds', 'Dr. Chloe Williams', 'Targeting the main protease (Mpro) of emerging coronaviruses is critical for pandemic readiness. We used High-Throughput Screening (HTS) of 50,000 small molecules to identify five leads with high binding affinity. ADMET profiling suggests low toxicity in human cell lines.', '/files/chem/antiviral_docking.pdf', 4, '2025-02-14', FALSE, NOW(), NOW()),
('Synthesis of Biodegradable Polymers from Corn Starch', 'Linda Park', 'Mechanical properties of PLA-blended composites.', '/files/chem/biodegradable_poly.pdf', 4, '2024-11-09', FALSE, NOW(), NOW()),

-- BUSINESS ADMINISTRATION (ID: 5)
('Consumer Neuropsychology in E-commerce Interface Design', 'Dr. Karen White', 'Eye-tracking data reveals that users prioritize F-shaped scanning patterns on product pages. This study quantifies the impact of "scarcity cues" (e.g., "Only 2 left!") on conversion rates across different age demographics, finding a 12% lift in Gen Z users but a 4% drop in trust among Boomers.', '/files/biz/ecommerce_neuro.pdf', 5, '2024-08-19', FALSE, NOW(), NOW()),
('Venture Capital Trends in Post-Pandemic Emerging Markets', 'James Liao', 'Analysis of seed-stage funding in Southeast Asia.', '/files/biz/vc_emerging_markets.pdf', 5, '2023-05-10', FALSE, NOW(), NOW()),
('Impact of ESG Reporting on Corporate Valuation', 'Monica Geller', 'This paper examines the correlation between high ESG scores and stock price volatility. Using data from the S&P 500 over a 10-year period, we find that firms with robust environmental disclosure policies exhibit a 15% lower cost of equity during market downturns.', '/files/biz/esg_valuation_final.pdf', 5, '2024-12-28', FALSE, NOW(), NOW()),
('Workforce Reskilling in the Age of Generative AI', 'Dr. Rebecca Stone', 'A qualitative study on the effectiveness of corporate training programs for displaced administrative staff. We find that peer-to-peer learning models outperform traditional lecture-based certifications by a margin of 3-to-1 in skill retention tests.', '/files/biz/ai_reskilling_study.pdf', 5, '2025-02-05', FALSE, NOW(), NOW());

-- BATCH 2: 20 RESEARCH PAPERS
INSERT INTO research_papers (title, author_name, abstract_text, file_path, department_id, submission_date, archived, created_at, updated_at)
VALUES
-- COMPUTER SCIENCE (ID: 1)
('Latency Optimization in 6G Terahertz Communication', 'Dr. Aris Thorne, Li Na', 'As we move toward 6G, the Terahertz (THz) band offers massive bandwidth but suffers from high path loss. This paper proposes a beam-steering algorithm that utilizes deep learning to predict user mobility, reducing handoff latency by 45%. We provide a full simulation of urban micro-cells under varying weather conditions.', '/files/cs/6g_latency_opt.pdf', 1, '2025-02-14', FALSE, NOW(), NOW()),
('Formal Verification of Smart Contracts', 'Sarah Jenkins', 'Bugs in smart contracts lead to millions in lost assets. This research introduces "SolidVerify," a tool that uses symbolic execution to check for reentrancy and integer overflow vulnerabilities in Solidity code. We tested SolidVerify on 1,000 top-tier Ethereum contracts, identifying 12 previously unknown critical bugs.', '/files/cs/smart_contract_formal.pdf', 1, '2024-11-30', FALSE, NOW(), NOW()),
('Federated Learning for Privacy-Preserving Image Recognition', 'Kevin Wu', 'Collaborative model training without data sharing.', '/files/cs/fed_learning_v2.pdf', 1, '2023-06-12', TRUE, '2023-06-12 10:00:00', NOW()),
('Neural Architecture Search for Low-Power Wearables', 'Elena Rossi', 'Manually designing neural networks for IoT is tedious. We propose a Reinforcement Learning-based search space that prioritizes energy efficiency over raw accuracy. The resulting models show a 3x increase in battery life for continuous heart-rate monitoring devices.', '/files/cs/nas_wearables.pdf', 1, '2024-05-18', FALSE, NOW(), NOW()),

-- MECHANICAL ENGINEERING (ID: 2)
('Generative Design of Heat Exchangers for EV Batteries', 'Marcus Vane, Chloe Williams', 'Electric vehicle range is heavily impacted by thermal management. This paper utilizes generative design to create complex internal cooling channels that cannot be manufactured via traditional milling. By using SLM 3D printing, we achieved a 22% increase in heat dissipation efficiency compared to standard plate-fin designs.', '/files/me/ev_thermal_gen.pdf', 2, '2025-01-05', FALSE, NOW(), NOW()),
('Kinematics of Bio-Inspired Soft Robotic Tentacles', 'Dr. Simon Choi', 'Soft robots offer safer human-robot interaction. We model a multi-segment pneumatic tentacle inspired by the octopus. This research focuses on the inverse kinematics of continuum robots, providing a real-time control algorithm that maintains sub-millimeter precision during object manipulation.', '/files/me/soft_robot_kinematics.pdf', 2, '2024-08-22', FALSE, NOW(), NOW()),
('Failure Analysis of Composite Wing Spars', 'Linda Park', 'Experimental testing of CFRP structures under fatigue.', '/files/me/composite_failure.pdf', 2, '2023-02-14', TRUE, '2023-02-14 09:00:00', NOW()),
('Hybrid Hydrogen-Electric Propulsion for Regional Aircraft', 'James Liao', 'The aviation industry must transition to zero-emission fuels. We analyze the weight-to-power trade-offs of using liquid hydrogen fuel cells to power electric fans in a 50-seat aircraft. Our simulations show a viable 500nm range with current cryogenic storage technology.', '/files/me/hydrogen_propulsion.pdf', 2, '2024-12-10', FALSE, NOW(), NOW()),

-- PHYSICS (ID: 3)
('Optical Metasurfaces for Ultra-Compact Lenses', 'Dr. Helena Ray', 'Traditional glass lenses are bulky and heavy. This paper explores the use of titanium dioxide nanopillars to create "metalenses" that are less than 1 micron thick. We demonstrate high-resolution imaging in the visible spectrum, suggesting a future where smartphone cameras no longer require a physical bump.', '/files/physics/metalens_optics.pdf', 3, '2024-10-05', FALSE, NOW(), NOW()),
('Spin-Valley Coupling in Transition Metal Dichalcogenides', 'Yuki Sato', 'Valleytronics represents a new paradigm for data storage. We investigate the spin-orbit coupling in monolayer MoS2 using ultra-fast laser spectroscopy. Our results indicate that valley polarization can be maintained for up to 10 nanoseconds at room temperature, a significant milestone for quantum information processing.', '/files/physics/spin_valley_tmd.pdf', 3, '2025-02-28', FALSE, NOW(), NOW()),
('Muon Tomography for Archaeological Exploration', 'Victor Vance', 'Using cosmic rays to image hidden chambers in pyramids.', '/files/physics/muon_archaeology.pdf', 3, '2023-11-12', FALSE, NOW(), NOW()),
('Non-Equilibrium Dynamics of Bose-Einstein Condensates', 'Sophia Chen', 'We study the formation of quantized vortices in a trapped Rb-87 gas. By rapidly quenching the temperature across the phase transition, we observe a Kibble-Zurek mechanism in action. This research provides insights into the early-universe symmetry breaking and topological defect formation.', '/files/physics/bec_dynamics.pdf', 3, '2024-04-15', FALSE, NOW(), NOW()),

-- CHEMISTRY (ID: 4)
('Perovskite Solar Cells: Stability and Degradation Pathways', 'Dr. Ahmed Al-Farsi', 'Perovskites offer high efficiency but lack long-term stability. This study identifies moisture-induced ion migration as the primary cause of efficiency loss. By incorporating a hydrophobic 2D-perovskite capping layer, we achieved 2,000 hours of continuous operation under 1-sun illumination with only 5% degradation.', '/files/chem/perovskite_stability.pdf', 4, '2024-07-20', FALSE, NOW(), NOW()),
('Green Synthesis of Silver Nanoparticles using Leaf Extracts', 'Maria Garcia', 'Eco-friendly chemical reduction using Eucalyptus globulus.', '/files/chem/green_nano_silver.pdf', 4, '2023-05-30', TRUE, '2023-05-30 14:00:00', NOW()),
('Self-Healing Supramolecular Elastomers', 'Paul Stein, Isabella Costa', 'Traditional rubber cannot be easily repaired once torn. We report the synthesis of a polymer network based on reversible hydrogen bonding. The material can spontaneously heal at room temperature within 30 minutes, regaining 90% of its original tensile strength. Potential applications include self-mending gaskets and seals.', '/files/chem/self_healing_polymer.pdf', 4, '2025-01-18', FALSE, NOW(), NOW()),
('Organocatalytic Asymmetric Michael Addition', 'Dr. Chloe Williams', 'Stereoselective synthesis of chiral pharmaceutical intermediates.', '/files/chem/organocatalysis_v4.pdf', 4, '2024-03-11', FALSE, NOW(), NOW()),

-- BUSINESS ADMINISTRATION (ID: 5)
('Dynamic Pricing Algorithms in Ride-Hailing Markets', 'Monica Geller', 'Surge pricing is often criticized by consumers. This paper uses game theory to analyze the equilibrium between driver supply and rider demand. We propose a "fairness-constrained" pricing model that reduces extreme price peaks by 20% while maintaining 98% of the platform’s revenue efficiency.', '/files/biz/surge_pricing_ethics.pdf', 5, '2024-09-14', FALSE, NOW(), NOW()),
('Blockchain for Supply Chain Transparency in Cobalt Mining', 'Dr. Rebecca Stone', 'Ethical sourcing is a major concern for battery manufacturers. We pilot a private Hyperledger Fabric network to track cobalt from artisanal mines in the DRC to European refineries. The study evaluates the cost-per-transaction and the feasibility of scaling this to global battery manufacturers.', '/files/biz/cobalt_blockchain.pdf', 5, '2024-06-05', FALSE, NOW(), NOW()),
('Psychological Safety and Innovation in Cross-Functional Teams', 'James Liao', 'Brief study on Google’s Project Aristotle findings.', '/files/biz/team_psych_safety.pdf', 5, '2023-08-01', TRUE, '2023-08-01 11:00:00', NOW()),
('The Gig Economy and Social Security Systems', 'Dr. Karen White, Liam Archer', 'As more workers transition to platform-based labor, traditional social safety nets are failing. This research compares the legislative approaches of California (AB5) and the EU’s Platform Work Directive. We model a portable benefits system that follows the worker rather than the employer.', '/files/biz/gig_economy_policy.pdf', 5, '2025-03-10', FALSE, NOW(), NOW());

```
