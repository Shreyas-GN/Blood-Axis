import { Metadata } from 'next';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../convex/_generated/api';

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const request = await fetchQuery(api.requests.getPublicMeta, { id });
    
    if (!request) return { title: 'Request Not Found' };

    const title = `Urgent ${request.blood_group} Blood Required at ${request.hospital_name}`;
    const description = `Immediate help needed. ${request.units} unit${request.units > 1 ? 's' : ''} of ${request.blood_group} required at ${request.hospital_name}${request.city ? `, ${request.city}` : ''}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        authors: ['Blood Axis'],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      }
    };
  } catch (error) {
    return {
      title: 'Emergency Blood Request',
    };
  }
}

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
