import type { ReactNode } from 'react';

type Tag = 'span' | 'p' | 'div' | 'legend' | 'header' | 'aside';
type Tone = 'muted' | 'subtle' | 'ink' | 'white';

interface Props {
	rule?: boolean;
	tone?: Tone;
	as?: Tag;
	className?: string;
	children: ReactNode;
}

const TONE_CLASS: Record<Tone, string> = {
	muted: 'text-ink-muted',
	subtle: 'text-ink-muted/70',
	ink: 'text-ink',
	white: 'text-white',
};

const TEXT_CLASS = 'font-mono text-[0.6rem] tracking-[0.32em] uppercase';

export function Eyebrow({
	rule = false,
	tone = 'muted',
	as,
	className = '',
	children,
}: Props) {
	const textClass = `${TEXT_CLASS} ${TONE_CLASS[tone]}`;

	if (rule) {
		const Wrapper = as ?? 'div';
		return (
			<Wrapper className={`flex items-center gap-3 ${className}`.trim()}>
				<span className="block w-8 gradient-rule" aria-hidden="true" />
				<span className={textClass}>{children}</span>
			</Wrapper>
		);
	}

	const Tag = as ?? 'span';
	return <Tag className={`${textClass} ${className}`.trim()}>{children}</Tag>;
}

export default Eyebrow;
