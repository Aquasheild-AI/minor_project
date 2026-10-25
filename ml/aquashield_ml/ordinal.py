"""
Ordinal classifier built from cumulative binary models (Frank & Hall, 2001):
one gradient-boosted model per threshold estimates P(y > k). Binary models
support monotonic constraints, which multiclass HistGradientBoosting does not.

Lives in the package (not the training script) so the pickled model can be
loaded by the backend.
"""
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier


class MonotonicOrdinalClassifier:
    def __init__(self, n_classes, monotonic_cst=None, **hgb_params):
        self.n_classes = n_classes
        self.monotonic_cst = monotonic_cst
        self.hgb_params = hgb_params

    def fit(self, X, y):
        y = np.asarray(y)
        self.models_ = []
        for k in range(self.n_classes - 1):
            model = HistGradientBoostingClassifier(monotonic_cst=self.monotonic_cst, **self.hgb_params)
            self.models_.append(model.fit(X, (y > k).astype(int)))
        return self

    def predict_proba(self, X):
        # exceed[:, k] = P(y > k); force non-increasing in k so probabilities stay valid.
        exceed = np.column_stack([m.predict_proba(X)[:, 1] for m in self.models_])
        exceed = np.minimum.accumulate(exceed, axis=1)
        upper = np.column_stack([np.ones(len(exceed)), exceed])
        lower = np.column_stack([exceed, np.zeros(len(exceed))])
        return np.clip(upper - lower, 0.0, 1.0)

    def predict(self, X):
        return self.predict_proba(X).argmax(axis=1)
