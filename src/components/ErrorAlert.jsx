function ErrorAlert({ message, onRetry }) {
	return (
		<div
			className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2"
			role="alert"
		>
			<span>{message}</span>

			<button
				type="button"
				className="btn btn-outline-danger btn-sm"
				onClick={onRetry}
			>
				Повторить
			</button>
		</div>
	);
}

export default ErrorAlert;
