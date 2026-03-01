export interface Module {
    id: string;
    name: string;
    subsystem: string;
    status: string;
    progress: number;
    deadline: string;
    order: number;
    link?: string;
    strategyType?: 'customization' | 'development' | 'demo' | 'text_description';
    strategy?: string;
    tender?: string;
    chapter?: string;
    modifiedModules?: string;
    history?: Array<{ time: string, content: string, color?: string, tag?: string }>;
    docs?: Array<{ name: string, type: string, date: string, size: string, url: string }>;
    issues?: Array<{ id: number, title: string, status: 'pending' | 'done', date: string, solvedDate?: string }>;
    feedbackGroups?: Array<{ partyA: { content: string, date: string }, replies: Array<{ content: string, date: string }> }>;
}

export interface ProjectInfo {
    name: string;
    clientUnit?: string;
    contractorUnit?: string;
    supervisionUnit?: string;
    intro?: string;
    contractDate?: string;
    startDate?: string;
    prePlanned?: string;
    preActual?: string;
    trialPeriod?: number;
    trialStart?: string;
    trialEnd?: string;
    finalPlanned?: string;
    finalActual?: string;
}

export type Role = 'team' | 'partyA' | null;
