import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../lib/ThemeContext';

interface HeaderProps {
	headerType: 'index' | 'list' | 'detail';
}

const Header = ({ headerType }: HeaderProps) => {
	const { logo } = useTheme();
	const navigate = useNavigate();

	return (
		<header className="bg-white dark:bg-gray-800 dark:bg-opacity-80 backdrop-blur-md text-gray-900 dark:text-gray-100 shadow-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800">
			<div className="container mx-auto flex justify-between items-center py-4 px-4">
				<Link to="/" className="text-2xl font-bold">
					<img src={logo} alt="PRify Logo" className="h-16" />
				</Link>
				<div className="flex space-x-4 items-center">
					{headerType === 'index' && (
						<>
							<Link to="/sign-in" className="bg-gray-100 dark:bg-gray-800 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
								Sign In
							</Link>
							<Link to="/sign-in" className="bg-[#dbf111] text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
								Get Started
							</Link>
						</>
					)}
					{headerType === 'list' && (
						<button
							onClick={() => navigate('/workout/new')}
							className="bg-[#dbf111] text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-[#c5d60f] transition-colors"
						>
							+ Add Workout
						</button>
					)}
					{/* For 'detail' headerType, no extra button is rendered */}
					<ThemeToggle />
				</div>
			</div>
		</header>
	);
};

export default Header;