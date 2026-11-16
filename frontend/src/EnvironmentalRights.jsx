
import {
  ShieldCheck,
  Wind,
  Droplets,
  Trees,
  Users,
  ExternalLink,
  Scale
} from 'lucide-react'

const rights = [
  {
    icon: Wind,
    title: 'Clean Air',
    description:
      'People need protection from harmful air pollution. Governments can use air-quality standards, monitoring and pollution controls to protect public health.'
  },
  {
    icon: Droplets,
    title: 'Safe Water',
    description:
      'Access to safe drinking water and sanitation is essential for health, dignity and well-being.'
  },
  {
    icon: Trees,
    title: 'Healthy Ecosystems',
    description:
      'Environmental protection includes conserving biodiversity, forests, wildlife and natural resources.'
  },
  {
    icon: Users,
    title: 'Public Participation',
    description:
      'People should have opportunities to access environmental information and participate in decisions that affect their surroundings.'
  }
]

const agreements = [
  {
    year: '2022',
    type: 'UN General Assembly Resolution',
    status: 'Non-binding resolution',
    title: 'Right to a Healthy Environment',
    description:
      'Resolution 76/300 recognizes the right to a clean, healthy and sustainable environment as a human right.',
    url: 'https://docs.un.org/en/A/RES/76/300'
  },
  {
    year: '1972',
    type: 'International Declaration',
    status: 'Non-binding declaration',
    title: 'Stockholm Declaration',
    description:
      'Established foundational principles connecting environmental protection with human well-being.',
    url: 'https://www.un.org/en/conferences/environment/stockholm1972'
  },
  {
    year: '1992',
    type: 'International Declaration',
    status: 'Non-binding declaration',
    title: 'Rio Declaration',
    description:
      'Sets out important principles on environmental information, public participation, precaution and sustainable development.',
    url: 'https://www.un.org/en/development/desa/population/migration/generalassembly/docs/globalcompact/A_CONF.151_26_Vol.I_Declaration.pdf'
  },
  {
    year: '1992',
    type: 'International Treaty',
    status: 'Binding on its parties',
    title: 'UN Framework Convention on Climate Change',
    description:
      'Provides the international framework for cooperation on climate change and reducing greenhouse gas concentrations.',
    url: 'https://unfccc.int/resource/docs/convkp/conveng.pdf'
  },
  {
    year: '2015',
    type: 'International Treaty',
    status: 'Binding on its parties',
    title: 'Paris Agreement',
    description:
      'Establishes a global framework for addressing climate change, including national climate plans and reporting.',
    url: 'https://unfccc.int/process-and-meetings/the-paris-agreement'
  }
]

export default function EnvironmentalRights() {
  return (
    <section id="rights" className="section rights-section">

      {/* HERO */}
      <div className="rights-hero">
        <div>
          <span className="eyebrow">
            ENVIRONMENTAL AWARENESS
          </span>

          <h2>Environmental Rights</h2>

          <p>
            A healthy environment is essential for human
            health, dignity and well-being. Learn about
            international environmental principles and the
            agreements that guide environmental protection.
          </p>
        </div>

        <div className="rights-hero-icon">
          <ShieldCheck size={42} />
        </div>
      </div>

      {/* LEGAL NOTE */}
      <div className="rights-note">
        <Scale size={21} />

        <p>
          <strong>Know the legal difference:</strong> Not every
          international declaration or resolution is legally
          binding. Treaties create legal obligations for their
          parties, while declarations and UN resolutions
          generally provide principles and guidance. Actual
          enforceable rights also depend on national laws.
        </p>
      </div>

      {/* RIGHTS */}
      <div className="section-head rights-heading">
        <div>
          <span className="eyebrow">YOUR RIGHTS MATTER</span>
          <h2>What does a healthy environment mean?</h2>
          <p>
            Important areas of environmental protection
            connected to human well-being.
          </p>
        </div>
      </div>

      <div className="rights-grid">
        {rights.map((right) => {
          const Icon = right.icon

          return (
            <article className="right-card" key={right.title}>
              <div className="right-icon">
                <Icon size={23} />
              </div>

              <h3>{right.title}</h3>
              <p>{right.description}</p>
            </article>
          )
        })}
      </div>

      {/* INTERNATIONAL AGREEMENTS */}
      <div className="section-head rights-heading">
        <div>
          <span className="eyebrow">GLOBAL FRAMEWORK</span>
          <h2>International Agreements</h2>
          <p>
            Explore major international instruments that
            shape environmental protection.
          </p>
        </div>
      </div>

      <div className="agreement-grid">
        {agreements.map((agreement) => (
          <article
            className="agreement-card"
            key={agreement.title}
          >
            <div className="agreement-top">
              <span>{agreement.year}</span>

              <span className="agreement-status">
                {agreement.status}
              </span>
            </div>

            <span className="agreement-type">
              {agreement.type}
            </span>

            <h3>{agreement.title}</h3>

            <p>{agreement.description}</p>

            <a
              href={agreement.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Official document
              <ExternalLink size={13} />
            </a>
          </article>
        ))}
      </div>

      {/* CITIZEN ACTION */}
      <div className="rights-action">
        <span className="eyebrow">TAKE ACTION</span>

        <h3>How can citizens make a difference?</h3>

        <p>
          Stay informed about local environmental conditions,
          report pollution through AirWatch, participate in
          public consultations where available, and learn
          about the environmental protections recognized
          under your country's laws.
        </p>
      </div>

    </section>
  )
}
