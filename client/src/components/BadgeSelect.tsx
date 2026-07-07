import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

export interface BadgeSelectOption<T extends string> {
	value: T;
	label: string;
	badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
}

export function BadgeSelect<T extends string>({
	value,
	options,
	onValueChange,
}: {
	value: T;
	options: BadgeSelectOption<T>[];
	onValueChange: (value: T) => void;
}) {
	const selected = options.find(option => option.value === value);

	return (
		<Select value={value} onValueChange={v => onValueChange(v as T)}>
			<SelectTrigger className='h-auto w-full gap-1.5 border-none bg-transparent p-0 font-medium focus:ring-0'>
				<Badge variant={selected?.badgeVariant ?? 'outline'}>
					<SelectValue />
				</Badge>
			</SelectTrigger>
			<SelectContent>
				{options.map(option => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
