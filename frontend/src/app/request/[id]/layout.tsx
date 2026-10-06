import { Metadata } from 'next';
import { getRequestByIdAction } from '@/app/actions/request.actions';

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const request = await getRequestByIdAction(id);
    
    if (!request) return { title: 'Request Not Found' };

    const title = `Urgent ${request.blood_group} Blood Required at ${request.hospital_name}`;
    const description = `Immediate help needed for ${request.patient_name || 'a patient'}. ${request.units} units of ${request.blood_group} required. Location: ${request.hospital_name}, ${request.city}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: request.created_at,
        authors: ['BloodRelay'],
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
