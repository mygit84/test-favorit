import Loader from './Loader';
import ErrorAlert from './ErrorAlert';
import EmptyState from './EmptyState';

// Колонка с заголовком, содержимое которой выбирается по статусу slice:
// загрузка, ошибка с повтором, пусто или данные (children). В статусе idle выводится подсказка idleText,
// если она передана, иначе ничего.
function StatusSection({ title, className, status, error, isEmpty, emptyText, idleText, onRetry, children }) {
	let content = null;

	if (status === 'idle' && idleText) {
		content = <EmptyState text={idleText} />;
	} else if (status === 'loading') {
		content = <Loader />;
	} else if (status === 'failed') {
		content = <ErrorAlert message={error} onRetry={onRetry} />;
	} else if (status === 'succeeded') {
		content = isEmpty ? <EmptyState text={emptyText} /> : children;
	}

	if (!content) return null;

	return (
		<div className={className}>
			<h2 className="h5">{title}</h2>

			{content}
		</div>
	);
}

export default StatusSection;
